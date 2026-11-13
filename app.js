import * as services from "./js/firebase.js";
import { createState } from "./js/state.js";
import { elements } from "./js/elements.js";
import { createEventBindings } from "./js/events.js";
import { createAuthFeature } from "./js/features/auth.js";
import { createWorkflowFeature } from "./js/features/workflow.js";
import { createWhatsappFeature } from "./js/features/whatsapp.js";
import { createBoardFeature } from "./js/features/board.js";
import { createFixedNotesFeature } from "./js/features/fixed-notes.js";
import { createDailyFeature } from "./js/features/daily.js";
import { createFiltersFeature } from "./js/features/filters.js";
import { createTicketsFeature } from "./js/features/tickets.js";
import { createBackupFeature } from "./js/features/backup.js";
import { createThemeFeature } from "./js/features/theme.js";

const state = createState();
// As ações conectam as funcionalidades sem importações circulares.
const actions = {};
const context = { state, elements, services, actions };

Object.assign(actions, createAuthFeature(context));
Object.assign(actions, createWorkflowFeature(context));
Object.assign(actions, createWhatsappFeature(context));
Object.assign(actions, createBoardFeature(context));
Object.assign(actions, createFixedNotesFeature(context));
Object.assign(actions, createDailyFeature(context));
Object.assign(actions, createFiltersFeature(context));
Object.assign(actions, createTicketsFeature(context));
Object.assign(actions, createBackupFeature(context));
Object.assign(actions, createThemeFeature(context));

createEventBindings(context).bindEvents();
actions.setupTheme();
actions.setupStatusOptions();
actions.setupWhatsappStatusOptions();
actions.render();
services.observarAutenticacao(actions.handleAuthenticationState);
