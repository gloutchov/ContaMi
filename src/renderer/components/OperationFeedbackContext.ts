import { createContext } from "react";
import type { TranslationKey } from "../i18n/translations";

// Only sanitized, localized error keys cross into forms, never raw provider/IPC errors.
export const OperationFeedbackContext = createContext<{ busy: boolean; error?: TranslationKey }>({ busy: false });
