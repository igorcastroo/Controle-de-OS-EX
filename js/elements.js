// Referências da interface, coletadas depois que o HTML foi carregado.
const board = document.querySelector("#board");
const columnTemplate = document.querySelector("#columnTemplate");
const ticketTemplate = document.querySelector("#ticketTemplate");
const ticketDialog = document.querySelector("#ticketDialog");
const ticketForm = document.querySelector("#ticketForm");
const dialogTitle = document.querySelector("#dialogTitle");
const deleteButton = document.querySelector("#deleteButton");
const archiveTicketButton = document.querySelector("#archiveTicketButton");
const statusInput = document.querySelector("#statusInput");
const importDialog = document.querySelector("#importDialog");
const importForm = document.querySelector("#importForm");
const importText = document.querySelector("#importText");
const archiveViewButton = document.querySelector("#archiveViewButton");
const fixedNotesViewButton = document.querySelector("#fixedNotesViewButton");
const fixedNotesView = document.querySelector("#fixedNotesView");
const fixedNotesInput = document.querySelector("#fixedNotesInput");
const fixedNotesStatus = document.querySelector("#fixedNotesStatus");
const dailyViewButton = document.querySelector("#dailyViewButton");
const dailyView = document.querySelector("#dailyView");
const dailyDateInput = document.querySelector("#dailyDateInput");
const dailyTitle = document.querySelector("#dailyTitle");
const dailyCount = document.querySelector("#dailyCount");
const dailyEntryForm = document.querySelector("#dailyEntryForm");
const dailyTextInput = document.querySelector("#dailyTextInput");
const dailyTicketInput = document.querySelector("#dailyTicketInput");
const dailyTicketIdInput = document.querySelector("#dailyTicketIdInput");
const dailyTicketOptions = document.querySelector("#dailyTicketOptions");
const dailyFormatInput = document.querySelector("#dailyFormatInput");
const dailyLinkTicketButton = document.querySelector("#dailyLinkTicketButton");
const dailyMemoTickets = document.querySelector("#dailyMemoTickets");
const dailyMemoStatus = document.querySelector("#dailyMemoStatus");
const dailyLinkedTickets = document.querySelector("#dailyLinkedTickets");
const dailySummaryText = document.querySelector("#dailySummaryText");
const dailyWhatsappButton = document.querySelector("#dailyWhatsappButton");
const dateFromInput = document.querySelector("#dateFromInput");
const dateToInput = document.querySelector("#dateToInput");
const todayFilterButton = document.querySelector("#todayFilterButton");
const clearDateFilterButton = document.querySelector("#clearDateFilterButton");
const archiveRangeButton = document.querySelector("#archiveRangeButton");
const viewLabel = document.querySelector("#viewLabel");
const noteInput = document.querySelector("#noteInput");
const noteEntryInput = document.querySelector("#noteEntryInput");
const addNoteButton = document.querySelector("#addNoteButton");
const noteHistory = document.querySelector("#noteHistory");
const newButtons = document.querySelectorAll("#headerNewButton");
const noteViewDialog = document.querySelector("#noteViewDialog");
const noteViewText = document.querySelector("#noteViewText");
const noteViewSaveButton = document.querySelector("#noteViewSaveButton");
const authButton = document.querySelector("#authButton");
const migrateButton = document.querySelector("#migrateButton");
const syncStatus = document.querySelector("#syncStatus");
const statusSettingsButton = document.querySelector("#statusSettingsButton");
const statusSettingsDialog = document.querySelector("#statusSettingsDialog");
const statusSettingsForm = document.querySelector("#statusSettingsForm");
const statusSettingsList = document.querySelector("#statusSettingsList");
const statusSettingsRowTemplate = document.querySelector("#statusSettingsRowTemplate");
const addStatusButton = document.querySelector("#addStatusButton");
const saveStatusSettingsButton = document.querySelector("#saveStatusSettingsButton");
const whatsappButton = document.querySelector("#whatsappButton");
const whatsappDialog = document.querySelector("#whatsappDialog");
const whatsappForm = document.querySelector("#whatsappForm");
const whatsappDateInput = document.querySelector("#whatsappDateInput");
const whatsappSingleDateField = document.querySelector("#whatsappSingleDateField");
const whatsappCustomDates = document.querySelector("#whatsappCustomDates");
const whatsappDateFromInput = document.querySelector("#whatsappDateFromInput");
const whatsappDateToInput = document.querySelector("#whatsappDateToInput");
const whatsappStatusOptions = document.querySelector("#whatsappStatusOptions");
const whatsappSelectionInfo = document.querySelector("#whatsappSelectionInfo");
const whatsappIncludeDailyInput = document.querySelector("#whatsappIncludeDailyInput");
const hasDailyView = [
  dailyViewButton,
  dailyView,
  dailyDateInput,
  dailyTitle,
  dailyCount,
  dailyEntryForm,
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
  dailyWhatsappButton,
].every(Boolean);
const hasFixedNotesView = [
  fixedNotesViewButton,
  fixedNotesView,
  fixedNotesInput,
  fixedNotesStatus,
].every(Boolean);

export const elements = {
  board,
  columnTemplate,
  ticketTemplate,
  ticketDialog,
  ticketForm,
  dialogTitle,
  deleteButton,
  archiveTicketButton,
  statusInput,
  importDialog,
  importForm,
  importText,
  archiveViewButton,
  fixedNotesViewButton,
  fixedNotesView,
  fixedNotesInput,
  fixedNotesStatus,
  dailyViewButton,
  dailyView,
  dailyDateInput,
  dailyTitle,
  dailyCount,
  dailyEntryForm,
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
  dailyWhatsappButton,
  dateFromInput,
  dateToInput,
  todayFilterButton,
  clearDateFilterButton,
  archiveRangeButton,
  viewLabel,
  noteInput,
  noteEntryInput,
  addNoteButton,
  noteHistory,
  newButtons,
  noteViewDialog,
  noteViewText,
  noteViewSaveButton,
  authButton,
  migrateButton,
  syncStatus,
  statusSettingsButton,
  statusSettingsDialog,
  statusSettingsForm,
  statusSettingsList,
  statusSettingsRowTemplate,
  addStatusButton,
  saveStatusSettingsButton,
  whatsappButton,
  whatsappDialog,
  whatsappForm,
  whatsappDateInput,
  whatsappSingleDateField,
  whatsappCustomDates,
  whatsappDateFromInput,
  whatsappDateToInput,
  whatsappStatusOptions,
  whatsappSelectionInfo,
  whatsappIncludeDailyInput,
  hasDailyView,
  hasFixedNotesView,
};
