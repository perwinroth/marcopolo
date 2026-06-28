// Countries where phone-auth SMS is allowed.
//
// This MUST stay in sync with the Firebase Identity Platform `smsRegionConfig`
// allow-list (see scripts/sms-region.py — Europe + US). If a user selects a
// country outside this list, Firebase accepts the request but never delivers an
// OTP SMS, so we restrict the phone-number country picker to these regions.
export const ALLOWED_SMS_COUNTRIES = [
    "AD", "AL", "AT", "BA", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI",
    "FO", "FR", "GB", "GI", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV",
    "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "SE", "SI", "SK",
    "SM", "UA", "US", "VA", "XK",
] as const;

// Default fallback country (used when the device locale is outside the allow-list).
export const DEFAULT_SMS_COUNTRY = "SE";

export function isAllowedSmsCountry(country: string | undefined): boolean {
    return !!country && (ALLOWED_SMS_COUNTRIES as readonly string[]).includes(country);
}
