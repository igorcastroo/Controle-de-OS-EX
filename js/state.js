import { COMPANY_CODES, STORAGE_KEY } from "./config.js";
import { loadTickets } from "./storage.js";
import { normalizeTicketDates } from "./domain/tickets.js";
import { cloneDefaultStatuses } from "./domain/statuses.js";
import { toDateInputValue } from "./utils/dates.js";

export function createState() {
  const localTickets = loadTickets(STORAGE_KEY, (item) => normalizeTicketDates(item, COMPANY_CODES));
  return {
    statuses: cloneDefaultStatuses(),
    whatsappPeriod: "today",
    tickets: [],
    dailyEntries: [],
    dailyMemoTicketIds: [],
    dailyMemoKey: "",
    dailyMemoSaveTimers: new Map(),
    dailyMemoSaveQueues: new Map(),
    fixedNotes: "",
    fixedNotesDirty: false,
    fixedNotesSaveTimer: null,
    fixedNotesSaveQueue: Promise.resolve(),
    localTickets,
    search: "",
    draggedId: null,
    view: "active",
    dailyDate: toDateInputValue(new Date()),
    dailyPeriod: "afternoon",
    dateFrom: "",
    dateTo: "",
    user: null,
    unsubscribeTickets: null,
    unsubscribeDailyEntries: null,
    unsubscribeFixedNotes: null,
    unsubscribeWorkflow: null,
    statusDraft: [],
  };
}
