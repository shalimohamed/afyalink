import type { Metadata } from "next";
import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";

export const metadata: Metadata = { title: "Privacy policy · AfyaLink" };

// Who to contact about personal data (shown publicly; chosen by Shali).
const CONTACT_EMAIL = "shalimahmud234@gmail.com";

// The privacy policy. Public (no login), linked from the footers and the
// register page; Google also asks for it before "Continue with Google" can be
// used by everyone. Keep it in line with what the app really does.
export default function PrivacyPage() {
  return (
    <div className="wrap auth">
      <DemoNotice />
      <nav>
        <Link className="logo" href="/">
          <span className="mark" aria-hidden="true" />
          AfyaLink
        </Link>
      </nav>
      <main className="auth-main">
        <article className="auth-card legal">
          <div className="eyebrow">Last updated 6 November 2026</div>
          <h1>Privacy policy</h1>
          <p className="sub">
            AfyaLink is a student project at USIU-Africa, built by Shali. It is a demo, not a real medical service:
            please use made-up names and symptoms. This page explains what the app stores, who can see it, and your
            rights under Kenya&apos;s Data Protection Act, 2019.
          </p>

          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Your account:</strong> name, email, M-Pesa phone number and password (stored scrambled by our
              login provider, never readable). Doctors also give their specialty, KMPDC registration number, fee and
              registration certificate.
            </li>
            <li>
              <strong>Health information you enter:</strong> symptom checks and the AI&apos;s suggestions, date of
              birth, sex, blood group, consultations, prescriptions, reviews and follow-up chat messages.
            </li>
            <li>
              <strong>Payments:</strong> the phone number used, the amount and the M-Pesa receipt code. AfyaLink uses
              Safaricom&apos;s test system (sandbox), so no real money moves.
            </li>
            <li>
              <strong>On your device only:</strong> login cookies (to keep you logged in), and the wellness check-in and
              install-banner choices, which stay in your browser and never reach us.
            </li>
          </ul>
          <p>Video calls are not recorded, and messages sent inside a video call are not stored.</p>

          <h2>Why we use it</h2>
          <p>
            Only to run AfyaLink: to suggest what kind of doctor you need, book and pay for consultations, hold the video
            call, issue prescriptions, keep your medical history, let admins verify doctors, and show admins overall
            numbers (counts and totals, never one person&apos;s records). We don&apos;t sell your data or use it for
            advertising.
          </p>

          <h2>Who can see it</h2>
          <ul>
            <li>
              <strong>You</strong> see all your own records.
            </li>
            <li>
              <strong>Your doctor</strong> sees your name, age, sex and blood group, the one symptom check you did just
              before a paid booking (not your other checks), and the prescriptions they write for you. Other doctors
              see nothing about you.
            </li>
            <li>
              <strong>Admins</strong> see account details (name, email, phone number, role) and who wrote each review,
              so they can deal with abuse. They can&apos;t see your symptom checks or prescriptions.
            </li>
            <li>
              <strong>Other patients</strong> see your reviews on a doctor&apos;s profile, without your name.
            </li>
          </ul>
          <p>These rules are enforced by the database itself (row-level security), not only by the website.</p>

          <h2>Services that process data for us</h2>
          <ul>
            <li>
              <strong>Supabase</strong>: database, logins and files (servers in London, UK).
            </li>
            <li>
              <strong>Vercel</strong>: runs the website.
            </li>
            <li>
              <strong>Google Gemini</strong>: the text of your symptom check is sent to Google&apos;s AI to suggest
              possible conditions. We use Google&apos;s free tier, where{" "}
              <strong>Google may use what you type to improve its products</strong>. That&apos;s another reason to
              type only made-up symptoms.
            </li>
            <li>
              <strong>Google sign-in</strong> (if you choose it): Google shares your name and email with us.
            </li>
            <li>
              <strong>LiveKit</strong>: carries the video calls.
            </li>
            <li>
              <strong>Safaricom (M-Pesa Daraja)</strong>: receives your phone number and the amount to send the payment
              prompt.
            </li>
            <li>
              <strong>Brevo</strong>: sends password reset emails to your email address.
            </li>
          </ul>

          <h2>How long we keep it</h2>
          <p>
            As long as your account exists. Because this is a demo, test data may be reset at any time. Ask us and we
            will delete your account and records.
          </p>

          <h2>Your rights</h2>
          <p>
            Under the Data Protection Act, 2019 you can ask to see, correct or delete your personal data, and object to
            how it&apos;s used. You can change your phone number, date of birth, sex and blood group yourself in{" "}
            <strong>Medical history → My details</strong>. For anything else, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If you&apos;re not satisfied with our answer, you
            can complain to the Office of the Data Protection Commissioner (ODPC) in Kenya.
          </p>

          <h2>Not for emergencies</h2>
          <p>
            AfyaLink is not an emergency service. If you have chest pain, trouble breathing, heavy bleeding, or thoughts
            of harming yourself, go to the nearest hospital or call 999 or 112.
          </p>
        </article>
      </main>
      <footer>
        <span>© 2026 AfyaLink · Nairobi, Kenya</span>
        <span>
          Questions about your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </span>
      </footer>
    </div>
  );
}
