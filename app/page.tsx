import Image from "next/image";
import Showcase from "@/components/Showcase";
// Free Pexels/Unsplash photo (credited in the footer). Importing it lets Next.js
// read its size and generate a blurred placeholder while it loads.
import doctorPhoto from "@/public/images/doctor.jpg";
import mosaicDoctorPhoto from "@/public/images/mosaic-doctor.jpg";
import mosaicHomePhoto from "@/public/images/mosaic-home.jpg";
import mosaicPhonePhoto from "@/public/images/mosaic-phone.jpg";
import heroDoctorPhoto from "@/public/images/hero-doctor.jpg";

const steps = [
  ["Describe your symptoms", "Type what you're feeling in your own words, English or Kiswahili."],
  ["Get matched", "Our AI suggests the right specialty and tells you how urgent it looks."],
  ["Pick a doctor", "Compare verified doctors by fee, experience, ratings and open slots."],
  ["Pay with M-Pesa", "Confirm the prompt on your phone with your PIN. No cards needed."],
  ["Consult", "Meet your doctor on a video call at your booked time. Follow-up questions? Chat with them if they allow it."],
  ["Get your prescription", "A digital prescription is saved to your medical history, ready for any pharmacy."],
];

const services = [
  ["Flu & colds", "Fever, cough, sore throat, body aches"],
  ["Skin conditions", "Rashes, acne, eczema, fungal infections"],
  ["Mental health", "Stress, anxiety, low mood, sleep problems"],
  ["Follow-ups", "Check in on a treatment without the queue"],
  ["Lab results", "Have a doctor explain your test results"],
  ["Second opinions", "Talk through a diagnosis or treatment plan"],
];

const trust = [
  ["Verified doctors", "Every doctor's credentials are checked before they can take bookings."],
  ["M-Pesa payments", "Pay through an STK prompt on your phone."],
  ["Private records", "Only you and your doctor can see your consultations."],
  ["Your history, in one place", "Past visits and prescriptions are saved to your account."],
];

export default function Home() {
  return (
    <div className="wrap">
      <nav>
        <a className="logo" href="#top">
          <span className="mark" aria-hidden="true" />
          AfyaLink
        </a>
        <div className="navlinks">
          <a href="#how">How it works</a>
          <a href="#services">Services</a>
          <a href="#doctors">For doctors</a>
        </div>
        <div className="navcta">
          <a className="login" href="/login">Log in</a>
          <a className="btn btn-primary" href="/register">Get started</a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div>
          <div className="eyebrow">Online consultations · Kenya</div>
          <h1>
            See a verified doctor today. <em>Pay with M-Pesa.</em>
          </h1>
          <p className="lede">
            Describe how you feel, and AfyaLink tells you which kind of doctor you need. Book a licensed doctor,
            meet them on a video call, and get a digital prescription without leaving home.
          </p>
          <div className="ctas">
            <a className="btn btn-primary" href="/register">Check my symptoms →</a>
            <a className="btn btn-ghost" href="#doctors">I&apos;m a doctor</a>
          </div>
          <div className="fineprint">
            <span>Doctors verified by our team</span>
            <span>Video consultations</span>
            <span>Digital prescriptions</span>
          </div>
        </div>
        {/* A big photo of one of the doctors patients can meet. */}
        <div className="hero-visual">
          <div className="hero-photo">
            <Image
              src={heroDoctorPhoto}
              alt="A smiling doctor in blue scrubs with a stethoscope, sitting at a desk with a laptop"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 560px"
              placeholder="blur"
              style={{ objectPosition: "50% 35%" }}
            />
            <span className="hero-chip">
              <span className="live-dot" aria-hidden="true" /> Video consultation
            </span>
          </div>
        </div>
      </header>

      <Showcase />

      <section id="how">
        <div className="sec-head">
          <div className="eyebrow">How it works</div>
          <h2>From “I don&apos;t feel well” to a prescription in one visit</h2>
        </div>
        <div className="steps">
          {steps.map(([title, text], i) => (
            <div className="step" key={title}>
              <div className="n">{String(i + 1).padStart(2, "0")}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Photo mosaic: one tall photo and two wide ones, each with a short caption. */}
      <section className="mosaic" aria-label="AfyaLink in everyday life">
        {/* These three photos are different from the slideshow's on purpose. */}
        <figure className="mosaic-tall">
          <Image src={mosaicDoctorPhoto} alt="A doctor with a stethoscope, arms crossed, smiling confidently" fill sizes="(max-width: 900px) 100vw, 560px" placeholder="blur" style={{ objectPosition: "50% 25%" }} />
          <figcaption>
            <b>Doctors you can trust</b>
            <span>Every doctor&apos;s KMPDC registration is checked by our team.</span>
          </figcaption>
        </figure>
        <figure>
          <Image src={mosaicPhonePhoto} alt="A young man smiling while using his phone outdoors" fill sizes="(max-width: 900px) 100vw, 520px" placeholder="blur" style={{ objectPosition: "50% 26%" }} />
          <figcaption>
            <b>Pay with M-Pesa</b>
            <span>Enter your PIN and your booking is confirmed.</span>
          </figcaption>
        </figure>
        <figure>
          <Image src={mosaicHomePhoto} alt="A woman at home in her kitchen, smiling at her phone" fill sizes="(max-width: 900px) 100vw, 520px" placeholder="blur" style={{ objectPosition: "70% 45%" }} />
          <figcaption>
            <b>Care from home</b>
            <span>No matatu, no queue, no waiting room.</span>
          </figcaption>
        </figure>
      </section>

      <section id="services">
        <div className="sec-head">
          <div className="eyebrow">What you can consult for</div>
          <h2>Care for the things that don&apos;t need a hospital visit</h2>
        </div>
        <div className="services">
          <div className="svc-list">
            {services.map(([title, text]) => (
              <div className="svc" key={title}>
                <b>{title}</b>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="notfor">
            <h3>Not for emergencies</h3>
            <p>Go to the nearest hospital straight away for:</p>
            <ul>
              <li>Chest pain or trouble breathing</li>
              <li>Heavy bleeding or serious injury</li>
              <li>Sudden weakness, confusion or fainting</li>
            </ul>
            <div className="call">Emergency lines: 999 · 112</div>
          </div>
        </div>
      </section>

      <section id="doctors">
        <div className="doctors">
          <div>
            <div className="doctors-photo">
              <Image
                src={doctorPhoto}
                alt="A doctor in a white coat talking to a patient on a phone video call"
                fill
                sizes="(max-width: 900px) 100vw, 560px"
                placeholder="blur"
              />
            </div>
            <div className="eyebrow">For doctors</div>
            <h2>See patients on your own schedule</h2>
            <p>Join AfyaLink, set the hours you&apos;re available, and consult from anywhere. Payments land by M-Pesa.</p>
            <a className="btn btn-sun" href="/register?role=doctor">Apply as a doctor</a>
          </div>
          <ul>
            <li><b>Get verified</b><span>Upload your KMPDC registration and our team reviews it.</span></li>
            <li><b>Set your hours and fee</b><span>Open slots when you&apos;re free and charge per session or per hour.</span></li>
            <li><b>Prescribe in the app</b><span>Write prescriptions that go straight to your patient&apos;s records.</span></li>
          </ul>
        </div>
      </section>

      <div className="trust">
        {trust.map(([title, text]) => (
          <div key={title}>
            <b>{title}</b>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <footer>
        <span>© 2026 AfyaLink · Nairobi, Kenya</span>
        <span>AfyaLink doesn&apos;t replace emergency care. In an emergency call 999 or 112.</span>
        <span className="credits">Photos: August de Richelieu, Tessy Agbonome and Ekaterina Bolovtsova on Pexels; Ahmed Nasiru, vaibhav vivian, Samwel Francis and YouVersion on Unsplash</span>
      </footer>
    </div>
  );
}
