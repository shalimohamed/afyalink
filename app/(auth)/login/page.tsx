import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in · AfyaLink" };

export default function LoginPage() {
  return <LoginForm />;
}
