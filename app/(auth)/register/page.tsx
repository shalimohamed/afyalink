import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account · AfyaLink" };

// The landing page links doctors to /register?role=doctor.
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <RegisterForm initialRole={role === "doctor" ? "doctor" : "patient"} />;
}
