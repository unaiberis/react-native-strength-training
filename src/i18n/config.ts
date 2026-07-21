import { i18n } from "@lingui/core";
import { messages as esMessages } from "./locales/es/messages";
import { messages as enMessages } from "./locales/en/messages";

i18n.load({
  es: esMessages,
  en: enMessages,
});

export { i18n };
