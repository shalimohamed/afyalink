import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import { HOME_FOR_ROLE, requireUser } from "@/lib/auth";
import { loadChats, type ChatState } from "@/lib/chats";
import { formatDate } from "@/lib/time";
import { answerChat } from "./actions";

export const metadata: Metadata = { title: "Follow-up chats · AfyaLink" };

const STATE_LABEL: Record<ChatState, string> = { waiting: "Waiting", open: "Open", closed: "Closed", rejected: "Declined" };
const STATE_TAG: Record<ChatState, string> = { waiting: "paying", open: "booked", closed: "free", rejected: "rejected" };

export default async function ChatsPage() {
  const { supabase, profile } = await requireUser();
  const isDoctor = profile.role === "doctor";
  const chats = await loadChats(supabase);

  return (
    <>
      <Link href={HOME_FOR_ROLE[profile.role]} className="back">
        ← Dashboard
      </Link>
      <div className="eyebrow">Free follow-up chat</div>
      <h1>Follow-up chats</h1>
      <p className="sub">
        {isDoctor
          ? "Past patients can ask you follow-up questions. Accepting opens the chat for 3 hours."
          : "Ask a doctor you've had a consultation with a follow-up question. It's free if they accept. Start a request from one of your consultations."}
      </p>

      {chats.length === 0 && <p className="empty">No chats yet.</p>}
      <ul className="list">
        {chats.map((chat) => (
          <li key={chat.id} className="item">
            <div className="item-main">
              <b>
                <Link href={`/chat/${chat.id}`}>
                  {isDoctor ? chat.patient?.profile.full_name : `Dr. ${chat.doctor?.profile.full_name}`}
                </Link>
              </b>
              <span>Requested {formatDate(chat.created_at)}</span>
            </div>
            <div className="item-actions">
              {isDoctor && chat.state === "waiting" ? (
                <>
                  <ActionButton action={answerChat} fields={{ chatId: chat.id, decision: "accept" }} label="Accept" className="btn btn-primary" />
                  <ActionButton action={answerChat} fields={{ chatId: chat.id, decision: "reject" }} label="Reject" />
                </>
              ) : (
                <span className={`tag ${STATE_TAG[chat.state]}`}>{STATE_LABEL[chat.state]}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
