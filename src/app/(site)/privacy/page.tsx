import type { Metadata } from "next";
import { DraftBanner, Prose } from "@/components/content/prose";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  const analytics = process.env.ANALYTICS_ENABLED === "true";
  return (
    <>
      <DraftBanner />
      <Prose title="Privacy policy" updated="[date of review]" intro={`How ${brand.name} collects and uses personal data, and the choices you have.`}>
        <h2>Who we are</h2>
        <p>
          {brand.legalEntity} is the controller of the personal data described here. Contact: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.
          [Registered address, company number and, if appointed, data protection contact to be added.]
        </p>

        <h2>What we collect, and why</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Why</th>
              <th>Lawful basis (to confirm)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account: name, email, password (stored only as a one-way hash), sign-in records including IP address and browser</td>
              <td>To run your account and keep it secure</td>
              <td>Contract; legitimate interests (security)</td>
            </tr>
            <tr>
              <td>Profile: the details you choose to add, and your photo</td>
              <td>To show your public profile when someone taps your card. You choose which details are public.</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Orders: name, delivery address, email, what you bought, any printed name, title or logo</td>
              <td>To make and deliver your cards, and for our accounts</td>
              <td>Contract; legal obligation (accounting records)</td>
            </tr>
            <tr>
              <td>Messages and team enquiries you send us</td>
              <td>To reply</td>
              <td>Legitimate interests</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Payments</strong> are handled by Stripe. We never see or store your card number. Stripe&apos;s privacy policy applies
          to the data you give it.
        </p>
        <p>
          <strong>Photos and logos</strong> are re-processed when you upload them, which removes hidden information such as location and
          camera details.
        </p>

        <h2>People who tap your card</h2>
        <p>
          When someone taps your card or opens your profile we don&apos;t set cookies, and we don&apos;t record who they are.
          {analytics
            ? " We count taps and profile views per day so you can see how often your card is used. These are totals only: no IP addresses, device details or other identifiers are stored."
            : " We don't keep visit statistics."}{" "}
          Our hosting provider may keep short-lived server logs for security. [Confirm retention with the hosting provider.]
        </p>

        <h2>Who we share data with</h2>
        <ul>
          <li>Stripe (payments)</li>
          <li>Our email provider (sending account and order emails) [name to be confirmed, e.g. Resend]</li>
          <li>Our hosting, database and file storage providers [names and locations to be confirmed]</li>
          <li>Our card printer, who receives card links and claim codes, and printed names, titles and logos for printed orders</li>
        </ul>
        <p>We don&apos;t sell personal data or use it for advertising. [List any transfers outside the UK/EEA and their safeguards.]</p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Account and profile: until you delete your account.</li>
          <li>Orders: [6 years] for tax and accounting, then deleted.</li>
          <li>Enquiries: [2 years] after the last contact.</li>
        </ul>

        <h2>Your rights</h2>
        <p>
          You can see, correct, download or delete your data. Most of this is self-service: edit your profile, download your data and
          delete your account in <a href="/dashboard/account">Account settings</a>. Deleting your account removes your profile and photo
          and switches off your cards. Order records we must keep for accounting stay, without a link to you. You can also object to
          or restrict some processing, and complain to the UK Information Commissioner&apos;s Office (ico.org.uk) or your local
          regulator.
        </p>

        <h2>Cookies</h2>
        <p>
          We only use cookies needed for the site to work. See the <a href="/cookies">cookie policy</a>.
        </p>
      </Prose>
    </>
  );
}
