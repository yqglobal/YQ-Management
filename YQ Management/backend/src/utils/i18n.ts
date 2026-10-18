export const translations: Record<string, Record<string, string>> = {
  en: {
    welcome:
      'Welcome to {{businessName}}! Your ticket number is {{ticketNumber}}.',
    appointment_reminder:
      'Reminder: You have an appointment at {{businessName}} at {{time}}.',
    ready_for_service: 'It is your turn! Please proceed to {{location}}.',
    feedback_request:
      'Thank you for visiting {{businessName}}. Please reply with a rating from 1 to 5.',
    thank_you: 'Thank you for your response!',
  },
  es: {
    welcome:
      '¡Bienvenido a {{businessName}}! Tu número de turno es {{ticketNumber}}.',
    appointment_reminder:
      'Recordatorio: Tienes una cita en {{businessName}} a las {{time}}.',
    ready_for_service: '¡Es tu turno! Por favor dirígete a {{location}}.',
    feedback_request:
      'Gracias por visitar {{businessName}}. Por favor responde con una calificación del 1 al 5.',
    thank_you: '¡Gracias por tu respuesta!',
  },
  fr: {
    welcome:
      'Bienvenue chez {{businessName}}! Votre numéro de ticket est {{ticketNumber}}.',
    appointment_reminder:
      'Rappel : Vous avez un rendez-vous chez {{businessName}} à {{time}}.',
    ready_for_service:
      "C'est votre tour ! Veuillez vous rendre à {{location}}.",
    feedback_request:
      'Merci de votre visite chez {{businessName}}. Veuillez répondre par une note de 1 à 5.',
    thank_you: 'Merci pour votre réponse !',
  },
};

export function t(
  key: string,
  lang: string = 'en',
  params: Record<string, string> = {},
): string {
  const dictionary = translations[lang] || translations['en'];
  let text = dictionary[key] || translations['en'][key] || key;

  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`{{(?:\\\\s+)?${k}(?:\\\\s+)?}}`, 'g'), v);
  }

  return text;
}
