import { DAILY_MEMO_FORMATS, DAILY_STORAGE_KEY } from "../config.js";
import { saveTickets } from "../storage.js";
import { createDailyEntry, getDailyEntriesFor, getDailyEntriesForDate, normalizeDailyEntry } from "../domain/daily.js";
import { toDateInputValue, formatDate, formatDateTime } from "../utils/dates.js";

export function createDailyFeature({ state, elements, services, actions }) {
  const {
    dailyDateInput,
    dailyTitle,
    dailyCount,
    dailyTextInput,
    dailyTicketInput,
    dailyTicketIdInput,
    dailyTicketOptions,
    dailyFormatInput,
    dailyLinkTicketButton,
    dailyMemoTickets,
    dailyMemoStatus,
    dailyLinkedTickets,
    dailySummaryText,
    syncStatus,
    hasDailyView,
  } = elements;

  function toggleDailyView() {
    if (!hasDailyView) return;
    const openingDailyView = state.view !== "daily";
    state.view = openingDailyView ? "daily" : "active";
    if (openingDailyView) {
      state.dailyPeriod = new Date().getHours() < 12 ? "morning" : "afternoon";
    }
    actions.render();
  }

  function changeDailyDate(dayOffset) {
    const [year, month, day] = state.dailyDate.split("-").map(Number);
    const date = new Date(year, month - 1, day + dayOffset, 12, 0, 0, 0);
    state.dailyDate = toDateInputValue(date);
    renderDailyView();
  }

  function renderDailyView() {
    if (!hasDailyView) return;
    dailyDateInput.value = state.dailyDate;
    dailyTitle.textContent = formatDate(`${state.dailyDate}T12:00:00`);
    const dayEntries = getDailyEntriesFor(state.dailyEntries, state.dailyDate, state.dailyPeriod);
    const allDayEntries = getDailyEntriesForDate(state.dailyEntries, state.dailyDate);
    const memo = dayEntries.find((entry) => entry.type === "memo");
    const memoKey = `${state.dailyDate}:${state.dailyPeriod}`;
    const periodLabel = state.dailyPeriod === "morning" ? "Manhã" : "Tarde/Noite";
    dailyCount.textContent = memo
      ? `Anotações em ${periodLabel}`
      : `${dayEntries.length} atividade(s) em ${periodLabel}`;
    dailySummaryText.textContent = allDayEntries.length
      ? ` ${allDayEntries.length} atividade(s) registrada(s) no dia.`
      : " Nenhuma atividade registrada neste dia.";
    document.querySelectorAll("[data-daily-period]").forEach((button) => {
      button.classList.toggle("active", button.dataset.dailyPeriod === state.dailyPeriod);
    });

    const enabled = Boolean(state.user);
    [dailyTextInput, dailyTicketInput, dailyFormatInput, dailyLinkTicketButton]
      .forEach((element) => { element.disabled = !enabled; });
    if (!enabled) {
      dailyMemoStatus.textContent = "Entre com Google para salvar";
    } else if (!state.dailyMemoSaveTimers.has(memoKey) && !state.dailyMemoSaveQueues.has(memoKey)) {
      dailyMemoStatus.textContent = "Salva automaticamente";
    }
    if (!enabled) hideDailyTicketOptions();
    dailyTextInput.placeholder = enabled
      ? "Escreva as atividades, observações e próximos passos do período..."
      : "Entre com Google para editar as anotações";

    if (state.dailyMemoKey !== memoKey || document.activeElement !== dailyTextInput) {
      state.dailyMemoKey = memoKey;
      state.dailyMemoTicketIds = memo
        ? getEntryTicketIds(memo)
        : [...new Set(dayEntries.flatMap(getEntryTicketIds))];
      dailyTextInput.value = memo
        ? memo.text
        : [...dayEntries].reverse()
          .map((entry) => `${formatDateTime(entry.createdAt).split(" ")[1] || ""} — ${entry.text}`.trim())
          .join("\n\n");
    }
    renderDailyMemoTickets();

    dailyLinkedTickets.innerHTML = "";
    const linkedTickets = [...new Set(allDayEntries.flatMap(getEntryTicketIds))]
      .map((ticketId) => state.tickets.find((ticket) => ticket.id === ticketId))
      .filter(Boolean);
    if (!linkedTickets.length) {
      const empty = document.createElement("p");
      empty.className = "daily-empty";
      empty.textContent = "Vincule uma OS à atividade para ela aparecer aqui.";
      dailyLinkedTickets.appendChild(empty);
    }
    linkedTickets.forEach((ticket) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "daily-linked-ticket";
      item.textContent = `${ticket.number || "Sem número"} — ${ticket.title || "Sem descrição"}`;
      item.addEventListener("click", () => actions.openTicketDialog(ticket));
      dailyLinkedTickets.appendChild(item);
    });
  }

  function getDailyTicketOptions() {
    return state.tickets
      .filter((ticket) => !ticket.archivedAt)
      .sort((first, second) => String(first.number).localeCompare(String(second.number), "pt-BR"));
  }

  function normalizeSearchValue(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function renderDailyTicketOptions() {
    if (!hasDailyView || dailyTicketInput.disabled) return;

    const query = normalizeSearchValue(dailyTicketInput.value);
    const tickets = getDailyTicketOptions().filter((ticket) => {
      const searchableText = normalizeSearchValue([
        ticket.number,
        ticket.title,
        ticket.company,
        ticket.companyCode,
      ].join(" "));
      return !query || searchableText.includes(query);
    });

    dailyTicketOptions.innerHTML = "";
    if (!tickets.length) {
      const empty = document.createElement("span");
      empty.className = "daily-ticket-no-results";
      empty.textContent = query ? "Nenhuma OS encontrada." : "Nenhuma OS ativa.";
      dailyTicketOptions.appendChild(empty);
    }

    tickets.forEach((ticket) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "daily-ticket-option";
      option.setAttribute("role", "option");

      const number = document.createElement("strong");
      number.textContent = ticket.number || "Sem número";
      const subject = document.createElement("small");
      subject.textContent = ticket.title || ticket.company || "Sem assunto";
      option.append(number, subject);
      option.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        selectDailyTicket(ticket);
      });
      dailyTicketOptions.appendChild(option);
    });

    dailyTicketOptions.hidden = false;
    dailyTicketInput.setAttribute("aria-expanded", "true");
  }

  function selectDailyTicket(ticket) {
    dailyTicketIdInput.value = ticket.id;
    dailyTicketInput.value = `${ticket.number || "Sem número"} — ${ticket.title || ticket.company || "Sem assunto"}`;
    hideDailyTicketOptions();
  }

  function hideDailyTicketOptions() {
    if (!dailyTicketOptions) return;
    dailyTicketOptions.hidden = true;
    dailyTicketInput?.setAttribute("aria-expanded", "false");
  }

  function getEntryTicketIds(entry) {
    return [...new Set([
      ...(Array.isArray(entry?.ticketIds) ? entry.ticketIds : []),
      entry?.ticketId,
    ].filter(Boolean))];
  }

  function getDailyMemo(date = state.dailyDate, period = state.dailyPeriod) {
    return state.dailyEntries.find((entry) => (
      entry.date === date && entry.period === period && entry.type === "memo"
    ));
  }

  function renderDailyMemoTickets() {
    dailyMemoTickets.innerHTML = "";
    const tickets = state.dailyMemoTicketIds
      .map((ticketId) => state.tickets.find((ticket) => ticket.id === ticketId))
      .filter(Boolean);
    dailyMemoTickets.hidden = !tickets.length;

    tickets.forEach((ticket) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "daily-memo-ticket";
      chip.textContent = `OS ${ticket.number || "sem número"} ×`;
      chip.title = `Remover vínculo com ${ticket.title || ticket.number || "a OS"}`;
      chip.addEventListener("click", () => {
        state.dailyMemoTicketIds = state.dailyMemoTicketIds.filter((ticketId) => ticketId !== ticket.id);
        renderDailyMemoTickets();
        scheduleDailyMemoSave();
      });
      dailyMemoTickets.appendChild(chip);
    });
  }

  function linkTicketToDailyMemo() {
    const ticketId = dailyTicketIdInput.value;
    if (!ticketId) {
      dailyTicketInput.focus();
      return;
    }

    const ticket = state.tickets.find((item) => item.id === ticketId);
    if (!state.dailyMemoTicketIds.includes(ticketId)) state.dailyMemoTicketIds.push(ticketId);
    if (ticket) {
      const fields = dailyFormatInput.value === "simples"
        ? [ticket.number, ticket.companyCode, ticket.company]
        : [ticket.number, ticket.company, ticket.companyCode];
      const prefix = fields
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" - ");
      if (prefix) {
        const needsLineBreak = dailyTextInput.value && !dailyTextInput.value.endsWith("\n");
        const format = DAILY_MEMO_FORMATS[dailyFormatInput.value] ?? DAILY_MEMO_FORMATS.atendimento;
        dailyTextInput.value += `${needsLineBreak ? "\n" : ""}${prefix} - ${format}`;
      }
    }
    dailyTicketInput.value = "";
    dailyTicketIdInput.value = "";
    hideDailyTicketOptions();
    renderDailyMemoTickets();
    dailyTextInput.focus();
    dailyTextInput.setSelectionRange(dailyTextInput.value.length, dailyTextInput.value.length);
    scheduleDailyMemoSave();
  }

  function getDailyMemoKey(date = state.dailyDate, period = state.dailyPeriod) {
    return `${date}:${period}`;
  }

  function updateDailyMemoStatus(key, text) {
    if (key === getDailyMemoKey()) dailyMemoStatus.textContent = text;
  }

  function scheduleDailyMemoSave() {
    if (!state.user) return;
    const data = {
      date: state.dailyDate,
      period: state.dailyPeriod,
      text: dailyTextInput.value.trim(),
      ticketIds: [...state.dailyMemoTicketIds],
    };
    const key = getDailyMemoKey(data.date, data.period);
    clearTimeout(state.dailyMemoSaveTimers.get(key));
    updateDailyMemoStatus(key, "Salvando...");
    state.dailyMemoSaveTimers.set(key, window.setTimeout(() => {
      state.dailyMemoSaveTimers.delete(key);
      const previousSave = state.dailyMemoSaveQueues.get(key) || Promise.resolve();
      const nextSave = previousSave
        .catch(() => undefined)
        .then(() => saveDailyMemo(data));
      state.dailyMemoSaveQueues.set(key, nextSave);
      nextSave.finally(() => {
        if (state.dailyMemoSaveQueues.get(key) === nextSave) state.dailyMemoSaveQueues.delete(key);
      });
    }, 700));
  }

  async function saveDailyMemo({ date, period, text, ticketIds }) {
    const key = getDailyMemoKey(date, period);
    const previous = getDailyMemo(date, period);
    if (!text && !ticketIds.length && !previous) {
      updateDailyMemoStatus(key, "Salva automaticamente");
      return;
    }

    const entry = previous
      ? normalizeDailyEntry({
        ...previous,
        text,
        ticketId: ticketIds[0] || "",
        ticketIds,
        updatedAt: new Date().toISOString(),
      })
      : createDailyEntry({
        date,
        period,
        text,
        category: "Anotações",
        type: "memo",
        ticketId: ticketIds[0] || "",
        ticketIds,
      });

    if (previous) {
      state.dailyEntries = state.dailyEntries.map((item) => item.id === entry.id ? entry : item);
    } else {
      state.dailyEntries.unshift(entry);
    }
    saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
    const saved = await actions.saveDailyEntryToFirestore(entry);
    updateDailyMemoStatus(key, saved ? "Salvo automaticamente" : "Erro ao salvar");
  }

  function formatNoteForDaily(text) {
    const ticketDetails = [
      document.querySelector("#numberInput").value.trim(),
      document.querySelector("#companyInput").value.trim(),
      document.querySelector("#companyCodeInput").value.trim(),
      text,
    ].filter(Boolean);

    return ticketDetails.join(" - ");
  }

  async function addNoteToDaily(text) {
    if (!state.user) {
      alert("Entre com Google para adicionar a observacao ao Diario.");
      return;
    }

    const now = new Date();
    const date = toDateInputValue(now);
    const period = now.getHours() < 12 ? "morning" : "afternoon";
    const ticketId = document.querySelector("#ticketId").value;
    const dailyText = formatNoteForDaily(text);
    const previous = getDailyMemo(date, period);
    const ticketIds = [...new Set([...getEntryTicketIds(previous), ticketId].filter(Boolean))];
    const entry = previous
      ? normalizeDailyEntry({
        ...previous,
        text: previous.text ? `${previous.text}\n\n${dailyText}` : dailyText,
        ticketId: ticketIds[0] || "",
        ticketIds,
        updatedAt: new Date().toISOString(),
      })
      : createDailyEntry({
        date,
        period,
        text: dailyText,
        category: "Anotações",
        type: "memo",
        ticketId: ticketIds[0] || "",
        ticketIds,
      });
    if (previous) {
      state.dailyEntries = state.dailyEntries.map((item) => item.id === entry.id ? entry : item);
    } else {
      state.dailyEntries.unshift(entry);
    }
    saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
    const saved = await actions.saveDailyEntryToFirestore(entry);

    // Uma atualização do Firestore pode chegar antes da confirmação do setDoc.
    // Reaplica o registro confirmado para que a anotação vinda da OS não suma do Diário.
    if (saved) {
      const index = state.dailyEntries.findIndex((item) => item.id === entry.id);
      if (index === -1) state.dailyEntries.unshift(entry);
      else state.dailyEntries[index] = entry;
      saveTickets(DAILY_STORAGE_KEY, state.dailyEntries);
      syncStatus.textContent = "Observação adicionada ao Diário.";
    } else {
      alert("Não foi possível salvar a observação no Diário. Tente novamente.");
    }

    if (hasDailyView) renderDailyView();
  }

  return {
    toggleDailyView,
    changeDailyDate,
    renderDailyView,
    getDailyTicketOptions,
    normalizeSearchValue,
    renderDailyTicketOptions,
    selectDailyTicket,
    hideDailyTicketOptions,
    getEntryTicketIds,
    getDailyMemo,
    renderDailyMemoTickets,
    linkTicketToDailyMemo,
    getDailyMemoKey,
    updateDailyMemoStatus,
    scheduleDailyMemoSave,
    saveDailyMemo,
    formatNoteForDaily,
    addNoteToDaily,
  };
}
