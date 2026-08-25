import { useEffect, useState } from "react";
import {
  MessageSquare,
  Mail,
  Check,
  Clock,
  X,
  Search,
  Send,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { customerDb } from "../app/firebase";

type Status = "new" | "in-progress" | "resolved" | "cancelled";

interface Inquiry {
  id: string;
  userId: string;
  name: string;
  contact: string;
  type: "email" | "phone" | "walk-in";
  subject: string;
  message: string;
  date: string;
  status: Status;
  pax: number;
  dates: string;
  read: boolean;
}

interface Reply {
  id: string;
  message: string;
  sender: "customer" | "receptionist";
  senderName: string;
  createdAt: Timestamp | null;
}

const STATUS_CONFIG: Record<
  Status,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  new: {
    label: "New",
    color: "#f97316",
    bg: "#fff7ed",
    icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    color: "#06b6d4",
    bg: "#ecfeff",
    icon: Clock,
  },
  resolved: {
    label: "Resolved",
    color: "#0d7377",
    bg: "#e2f3f2",
    icon: Check,
  },
  cancelled: {
    label: "Cancelled",
    color: "#d4183d",
    bg: "#fef2f2",
    icon: X,
  },
};

export default function Inquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);

  useEffect(() => {
    const loadInquiries = async () => {
      try {
        setLoading(true);

        const inquiriesQuery = query(
          collection(customerDb, "Inquiries"),
          orderBy("createdAt", "desc"),
        );

        const snapshot = await getDocs(inquiriesQuery);

        const loadedInquiries: Inquiry[] = snapshot.docs.map((inquiryDoc) => {
          const data = inquiryDoc.data();

          return {
            id: inquiryDoc.id,
            userId: String(data.userId ?? ""),
            name: String(data.name ?? ""),
            contact: String(data.contact ?? data.email ?? data.phone ?? "N/A"),
            type: data.type ?? "email",
            subject: String(data.subject ?? ""),
            message: String(data.message ?? ""),
            date: data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleString()
              : String(data.date ?? ""),
            status: data.status ?? "new",
            pax: Number(data.pax ?? data.guests ?? 1),
            dates: String(data.dates ?? ""),
            read: data.read === true,
          };
        });

        setInquiries(loadedInquiries);
      } catch (error) {
        console.error("Error loading inquiries:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();
  }, []);

  useEffect(() => {
    if (!selected?.id) {
      setReplies([]);
      return;
    }

    const repliesRef = collection(
      customerDb,
      "Inquiries",
      selected.id,
      "replies",
    );

    const repliesQuery = query(repliesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      repliesQuery,
      (snapshot) => {
        const loadedReplies: Reply[] = snapshot.docs.map((replyDoc) => {
          const data = replyDoc.data();

          return {
            id: replyDoc.id,
            message: String(data.message ?? ""),
            sender: data.sender === "customer" ? "customer" : "receptionist",
            senderName: String(data.senderName ?? "Customer"),
            createdAt: data.createdAt ?? null,
          };
        });

        setReplies(loadedReplies);
      },
      (error) => {
        console.error("Error loading inquiry replies:", error);
      },
    );

    return () => unsubscribe();
  }, [selected?.id]);

  const filtered = inquiries.filter((inquiry) => {
    const searchText = search.toLowerCase().trim();

    const matchSearch =
      inquiry.name.toLowerCase().includes(searchText) ||
      inquiry.subject.toLowerCase().includes(searchText) ||
      inquiry.message.toLowerCase().includes(searchText) ||
      inquiry.contact.toLowerCase().includes(searchText);

    const matchFilter = filter === "all" || inquiry.status === filter;

    return matchSearch && matchFilter;
  });

  const markAsRead = async (inquiry: Inquiry) => {
    setSelected({
      ...inquiry,
      read: true,
    });

    if (inquiry.read) return;

    try {
      await updateDoc(doc(customerDb, "Inquiries", inquiry.id), {
        read: true,
      });

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === inquiry.id ? { ...item, read: true } : item,
        ),
      );
    } catch (error) {
      console.error("Error marking inquiry as read:", error);
    }
  };

  const updateStatus = async (id: string, status: Status) => {
    try {
      await updateDoc(doc(customerDb, "Inquiries", id), {
        status,
        updatedAt: serverTimestamp(),
      });

      setInquiries((prev) =>
        prev.map((inquiry) =>
          inquiry.id === id ? { ...inquiry, status } : inquiry,
        ),
      );

      setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
    } catch (error) {
      console.error("Error updating inquiry status:", error);
      alert("Failed to update inquiry status.");
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;

    if (selected.status === "resolved" || selected.status === "cancelled") {
      alert("This inquiry is already closed.");
      return;
    }

    try {
      setSendingReply(true);

      await addDoc(
        collection(customerDb, "Inquiries", selected.id, "replies"),
        {
          message: reply.trim(),
          sender: "receptionist",
          senderName: "Receptionist",
          userId: selected.userId,
          createdAt: serverTimestamp(),
        },
      );

      if (selected.status === "new") {
        await updateStatus(selected.id, "in-progress");
      }

      setReply("");
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const formatReplyTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return "Sending...";

    return timestamp.toDate().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full h-full min-h-0">
      <div className="flex w-full h-full min-h-0 gap-4 lg:gap-6">
        <div
          className={`${
            selected ? "hidden lg:flex" : "flex"
          } w-full lg:w-96 lg:flex-shrink-0 bg-white rounded-xl border flex-col min-h-0 overflow-hidden`}
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          <div
            className="p-3 sm:p-4 border-b space-y-3 flex-shrink-0"
            style={{
              borderColor: "rgba(13,115,119,0.1)",
            }}
          >
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{
                  color: "#4a7a7a",
                }}
              />

              <input
                type="text"
                placeholder="Search inquiries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(
                ["all", "new", "in-progress", "resolved", "cancelled"] as const
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap"
                  style={{
                    background: filter === status ? "#0d7377" : "#e2f3f2",
                    color: filter === status ? "#fff" : "#0d7377",
                  }}
                >
                  {status === "all" ? "All" : STATUS_CONFIG[status].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y">
            {loading ? (
              <div
                className="p-6 text-center text-sm"
                style={{
                  color: "#4a7a7a",
                }}
              >
                Loading inquiries...
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="p-6 text-center text-sm"
                style={{
                  color: "#4a7a7a",
                }}
              >
                No inquiries found.
              </div>
            ) : (
              filtered.map((inq) => {
                const status = STATUS_CONFIG[inq.status];

                return (
                  <button
                    key={inq.id}
                    onClick={async () => {
                      setSelected(inq);

                      if (!inq.read) {
                        try {
                          await updateDoc(
                            doc(customerDb, "Inquiries", inq.id),
                            {
                              read: true,
                            },
                          );

                          setInquiries((prev) =>
                            prev.map((item) =>
                              item.id === inq.id
                                ? { ...item, read: true }
                                : item,
                            ),
                          );
                        } catch (error) {
                          console.error(
                            "Error marking inquiry as read:",
                            error,
                          );
                        }
                      }
                    }}
                    className="w-full text-left p-3 sm:p-4 transition-colors"
                    style={{
                      background:
                        selected?.id === inq.id ? "#f0f9f8" : "transparent",
                    }}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "#e2f3f2",
                        }}
                      >
                        <MessageSquare
                          className="w-4 h-4"
                          style={{
                            color: "#0d7377",
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="text-sm font-medium truncate flex-1"
                            style={{
                              color: "#0a2e2e",
                            }}
                          >
                            {inq.name}
                          </span>

                          <span
                            className="text-[10px] sm:text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full"
                            style={{
                              background: status.bg,
                              color: status.color,
                            }}
                          >
                            {status.label}
                          </span>
                        </div>

                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{
                            color: "#4a7a7a",
                          }}
                        >
                          {inq.subject}
                        </p>

                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{
                            color: "#4a7a7a",
                          }}
                        >
                          {inq.date}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          className={`${
            selected ? "flex" : "hidden lg:flex"
          } flex-1 min-w-0 min-h-0 bg-white rounded-xl border flex-col overflow-hidden`}
          style={{
            borderColor: "rgba(13,115,119,0.1)",
          }}
        >
          {!selected ? (
            <div
              className="flex-1 flex items-center justify-center flex-col gap-3 p-6"
              style={{
                color: "#4a7a7a",
              }}
            >
              <MessageSquare className="w-12 h-12 opacity-30" />

              <p className="text-sm text-center">
                Select an inquiry to view details
              </p>
            </div>
          ) : (
            <>
              <div
                className="px-3 sm:px-6 py-3 sm:py-4 border-b flex items-center gap-3 flex-shrink-0"
                style={{
                  borderColor: "rgba(13,115,119,0.1)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="lg:hidden flex-shrink-0 p-2 rounded-lg"
                  style={{
                    color: "#0d7377",
                    background: "#f0f9f8",
                  }}
                  aria-label="Back to inquiries"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="min-w-0 flex-1">
                  <h3
                    className="font-medium truncate"
                    style={{
                      color: "#0a2e2e",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {selected.name}
                  </h3>

                  <p
                    className="text-xs sm:text-sm truncate"
                    style={{
                      color: "#4a7a7a",
                    }}
                  >
                    {selected.subject} · {selected.date}
                  </p>
                </div>

                <div className="flex gap-1 sm:gap-2 flex-wrap justify-end">
                  {(["in-progress", "resolved", "cancelled"] as Status[]).map(
                    (status) => {
                      const cfg = STATUS_CONFIG[status];

                      return (
                        <button
                          key={status}
                          onClick={() => updateStatus(selected.id, status)}
                          className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm border whitespace-nowrap"
                          style={{
                            borderColor:
                              selected.status === status
                                ? cfg.color
                                : "rgba(13,115,119,0.2)",

                            background:
                              selected.status === status
                                ? cfg.bg
                                : "transparent",

                            color:
                              selected.status === status
                                ? cfg.color
                                : "#4a7a7a",
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    {
                      label: "Contact",
                      value: selected.contact,
                    },
                    {
                      label: "Type",
                      value: selected.type,
                    },
                    {
                      label: "Guests",
                      value: `${selected.pax} pax`,
                    },
                    {
                      label: "Requested Dates",
                      value: selected.dates || "Not specified",
                    },
                  ].map((field) => (
                    <div
                      key={field.label}
                      className="p-3 rounded-lg min-w-0 overflow-hidden"
                      style={{
                        background: "#f0f9f8",
                      }}
                    >
                      <p
                        className="text-xs mb-1"
                        style={{
                          color: "#4a7a7a",
                        }}
                      >
                        {field.label}
                      </p>

                      <p
                        className="text-sm break-words"
                        style={{
                          color: "#0a2e2e",
                        }}
                      >
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className="p-3 sm:p-4 rounded-xl overflow-hidden"
                  style={{
                    background: "#f0f9f8",
                    borderLeft: "4px solid #0d7377",
                  }}
                >
                  <p
                    className="text-xs mb-2 font-medium"
                    style={{
                      color: "#0d7377",
                    }}
                  >
                    Guest Message
                  </p>

                  <p
                    className="text-sm break-words whitespace-pre-wrap"
                    style={{
                      color: "#0a2e2e",
                    }}
                  >
                    {selected.message}
                  </p>
                </div>

                <div>
                  <p
                    className="text-sm font-medium mb-3"
                    style={{
                      color: "#0a2e2e",
                    }}
                  >
                    Conversation
                  </p>

                  <div className="space-y-3">
                    {replies.length === 0 ? (
                      <p
                        className="text-sm"
                        style={{
                          color: "#4a7a7a",
                        }}
                      >
                        No replies yet.
                      </p>
                    ) : (
                      replies.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.sender === "receptionist"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div className="max-w-[85%] sm:max-w-lg min-w-0">
                            <div
                              className="px-3 sm:px-4 py-3 rounded-xl text-sm break-words whitespace-pre-wrap"
                              style={{
                                background:
                                  msg.sender === "receptionist"
                                    ? "#e2f3f2"
                                    : "#f0f9f8",
                                color: "#0a2e2e",
                              }}
                            >
                              {msg.message}
                            </div>

                            <p
                              className={`text-[10px] text-gray-400 mt-1 ${
                                msg.sender === "receptionist"
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {msg.senderName} ·{" "}
                              {formatReplyTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pb-2">
                  <p
                    className="text-sm font-medium mb-2"
                    style={{
                      color: "#0a2e2e",
                    }}
                  >
                    Reply
                  </p>

                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    disabled={
                      selected.status === "resolved" ||
                      selected.status === "cancelled" ||
                      sendingReply
                    }
                    placeholder={
                      selected.status === "resolved"
                        ? "This inquiry is resolved."
                        : selected.status === "cancelled"
                          ? "This inquiry is cancelled."
                          : "Type your reply..."
                    }
                    className="w-full px-3 sm:px-4 py-3 rounded-lg border text-sm outline-none resize-none disabled:bg-gray-100"
                    style={{
                      borderColor: "rgba(13,115,119,0.2)",
                      background: "#f0f9f8",
                      color: "#0a2e2e",
                    }}
                  />

                  <div className="flex justify-end mt-2">
                    <button
                      onClick={sendReply}
                      disabled={
                        !reply.trim() ||
                        sendingReply ||
                        selected.status === "resolved" ||
                        selected.status === "cancelled"
                      }
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm text-white disabled:opacity-50"
                      style={{
                        background: "#0d7377",
                      }}
                    >
                      {sendingReply ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
