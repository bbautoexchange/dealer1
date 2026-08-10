export type SmsConsentState = {
  smsCustomerCareConsent: boolean
  smsMarketingConsent: boolean
}

export const emptySmsConsent: SmsConsentState = {
  smsCustomerCareConsent: false,
  smsMarketingConsent: false,
}

type Props = {
  value: SmsConsentState
  onChange: (value: SmsConsentState) => void
}

export default function SmsConsent({ value, onChange }: Props) {
  return <fieldset className="sms-consent">
    <legend>Text message preferences</legend>
    <p>By checking either box, you authorize B &amp; B Auto Exchange to send text messages with offers and other information, including via automated technology, to the number you provided.</p>
    <label className="sms-consent-option"><input type="checkbox" checked={value.smsCustomerCareConsent} onChange={(event) => onChange({ ...value, smsCustomerCareConsent: event.target.checked })} /> <span>I consent to receive customer care and vehicle notification text messages.</span></label>
    <label className="sms-consent-option"><input type="checkbox" checked={value.smsMarketingConsent} onChange={(event) => onChange({ ...value, smsMarketingConsent: event.target.checked })} /> <span>I consent to receive marketing and promotional text messages. Consent is not a condition of purchase.</span></label>
    <small>Message frequency will vary. Msg &amp; data rates may apply. Reply HELP for help or STOP to cancel. See our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms and Conditions</a>.</small>
  </fieldset>
}
