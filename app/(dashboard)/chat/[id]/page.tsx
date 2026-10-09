import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { requireUser } from "@/lib/auth";
import { loadChat } from "@/lib/chats";
import { answerChat, requestChat } from "../actions";
import ChatRoom, { type Message } from "./ChatRoom";
import StatusWatcher from "./StatusWatcher";

export const metadata: Metadata = { title: "Follow-up chat · AfyaLink" };

const timeFormat = new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const chat = await loadChat(supabase, id); // RLS: only the patient and doctor of this chat
  if (!chat) notFound();

  const isDoctor = profile.id === chat.doctor_id;
  const otherName = isDoctor ? chat.patient?.profile.full_name : `Dr. ${chat.doctor?.profile.full_name}`;

  const { data: messageData } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("chat_request_id", chat.id)
    .order("created_at");
  const messages = (messageData ?? []) as Message[];

  return (
    <>
      <Link href="/chat" className="back">
        ← All chats
      </Link>
      <div className="eyebrow">Free follow-up chat</div>
      <h1>{otherName}</h1>

      {chat.state === "waiting" &&
        (isDoctor ? (
          <div className="item">
            <span>{chat.patient?.profile.full_name} would like a follow-up chat. If you accept, it stays open for 3 hours.</span>
            <div className="item-actions">
              <ActionButton action={answerChat} fields={{ chatId: chat.id, decision: "accept" }} label="Accept" className="btn btn-primary" />
              <ActionButton action={answerChat} fields={{ chatId: chat.id, decision: "reject" }} label="Reject" />
            </div>
          </div>
        ) : (
          <>
            <StatusWatcher chatId={chat.id} />
            <p className="notice ok">Request sent. Waiting for the doctor to accept. This page updates by itself.</p>
          </>
        ))}

      {chat.state === "rejected" &&
        (isDoctor ? (
          <p className="notice ok">You declined this request.</p>
        ) : (
          <div className="chat">
            <div className="chat-log">
              {/* The automated reply the patient gets when the doctor declines. */}
              <div className="bubble system">
                <span>Please book a consultation to communicate with the doctor.</span>
                <small>AfyaLink</small>
              </div>
            </div>
            <Link href={`/patient/doctors/${chat.doctor_id}`} className="btn btn-primary">
              Book a consultation
            </Link>
          </div>
        ))}

      {chat.state === "open" && chat.closesAt && (
        <>
          <p className="sub">Open until {timeFormat.format(new Date(chat.closesAt))} (Kenyan time). Follow-up chats are free.</p>
          <ChatRoom chatId={chat.id} myId={profile.id} initialMessages={messages} closesAt={chat.closesAt} />
        </>
      )}

      {chat.state === "closed" && (
        <>
          <p className="notice ok">
            This chat closed after 3 hours.{" "}
            {isDoctor ? "The patient can send a new request." : "You can send a new request, and the doctor can accept or decline it."}
          </p>
          <ChatRoom chatId={chat.id} myId={profile.id} initialMessages={messages} closesAt={null} />
          {!isDoctor && (
            <ActionButton action={requestChat} fields={{ doctorId: chat.doctor_id }} label="Request a new chat" className="btn btn-primary" />
          )}
        </>
      )}
    </>
  );
}
