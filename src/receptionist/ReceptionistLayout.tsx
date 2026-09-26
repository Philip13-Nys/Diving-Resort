import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  BookOpen,
  UserPlus,
  Users,
  BedDouble,
  CreditCard,
  BarChart3,
  Shell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
  CalendarCheck,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db, customerDb } from "../app/firebase";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";

const NAV_ITEMS: {
  id:
    | "dashboard"
    | "calendar"
    | "inquiries"
    | "reservations"
    | "walkin"
    | "guests"
    | "availability"
    | "payments"
    | "reports";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
  { id: "reservations", label: "Reservations", icon: BookOpen },
  { id: "walkin", label: "Walk-in", icon: UserPlus },
  { id: "guests", label: "Guests", icon: Users },
  { id: "availability", label: "Room Availability", icon: BedDouble },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

type Notification = {
  id: string;
  type: "inquiry" | "booking";
  title: string;
  message: string;
  timestamp: number;
  unread: boolean;
  bookingId?: string;
};

export default function ReceptionistLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [inquiries, setInquiries] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const [userName, setUserName] = useState("Receptionist");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("R");

  /*
   * Store the IDs that the receptionist has already viewed.
   *
   * localStorage is used so refreshing the receptionist page
   * does not immediately make all old notifications unread again.
   */
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(
    () => {
      try {
        const saved = localStorage.getItem("receptionistReadNotifications");

        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },
  );

  /*
   * REAL-TIME INQUIRIES
   */
  useEffect(() => {
    const inquiriesRef = collection(customerDb, "Inquiries");

    const unsubscribe = onSnapshot(
      inquiriesRef,
      (snapshot) => {
        const inquiryData = snapshot.docs.map((inquiryDoc) => ({
          id: inquiryDoc.id,
          ...inquiryDoc.data(),
        }));

        setInquiries(inquiryData);
      },
      (error) => {
        console.error("Error loading inquiry notifications:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * REAL-TIME BOOKINGS
   *
   * Your BookingPage saves bookings here:
   *
   * customerDb -> Bookings
   */
  useEffect(() => {
    const bookingsRef = collection(customerDb, "Bookings");

    const unsubscribe = onSnapshot(
      bookingsRef,
      (snapshot) => {
        const bookingData = snapshot.docs.map((bookingDoc) => ({
          id: bookingDoc.id,
          ...bookingDoc.data(),
        }));

        setBookings(bookingData);
      },
      (error) => {
        console.error("Error loading booking notifications:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * USER PROFILE
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setUserName("Receptionist");
          setUserEmail("");
          setUserInitial("R");
          return;
        }

        setUserEmail(user.email || "");

        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const name = String(data.name || "").trim();

          if (name) {
            setUserName(name);
            setUserInitial(name.charAt(0).toUpperCase());
          } else {
            const authName = user.displayName?.trim();

            if (authName) {
              setUserName(authName);
              setUserInitial(authName.charAt(0).toUpperCase());
            }
          }
        } else {
          const authName = user.displayName?.trim();

          if (authName) {
            setUserName(authName);
            setUserInitial(authName.charAt(0).toUpperCase());
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  /*
   * CONVERT INQUIRIES + BOOKINGS INTO ONE NOTIFICATION LIST
   */
  const notifications: Notification[] = [
    ...inquiries.map((inquiry) => {
      const createdAt =
        inquiry.createdAt?.toMillis?.() ||
        inquiry.createdAt?.seconds * 1000 ||
        0;

      return {
        id: `inquiry-${inquiry.id}`,
        type: "inquiry" as const,
        title: inquiry.name || inquiry.customerName || "New Customer Inquiry",
        message:
          inquiry.message ||
          inquiry.subject ||
          "A customer sent a new inquiry.",
        timestamp: createdAt,
        unread:
          inquiry.read !== true &&
          !readNotificationIds.includes(`inquiry-${inquiry.id}`),
      };
    }),

    ...bookings
      .filter((booking) => booking.status !== "cancelled")
      .map((booking) => {
        const createdAt =
          booking.createdAt?.toMillis?.() ||
          booking.createdAt?.seconds * 1000 ||
          0;

        const bookingRef = booking.bookingRef || booking.id;

        return {
          id: `booking-${booking.id}`,
          type: "booking" as const,
          title: booking.customerName || "New Booking",
          message: `Booking ${bookingRef} • ${booking.roomName || "Room"}`,
          timestamp: createdAt,
          unread: !readNotificationIds.includes(`booking-${booking.id}`),
          bookingId: booking.id,
        };
      }),
  ].sort((a, b) => b.timestamp - a.timestamp);

  /*
   * ONLY SHOW THE LATEST 10 NOTIFICATIONS
   */
  const displayedNotifications = notifications.slice(0, 10);

  /*
   * TOTAL UNREAD
   */
  const unreadNotificationCount = notifications.filter(
    (notification) => notification.unread,
  ).length;

  /*
   * MARK ONE NOTIFICATION AS READ
   */
  const markNotificationAsRead = (notificationId: string) => {
    setReadNotificationIds((previous) => {
      if (previous.includes(notificationId)) {
        return previous;
      }

      const updated = [...previous, notificationId];

      localStorage.setItem(
        "receptionistReadNotifications",
        JSON.stringify(updated),
      );

      return updated;
    });
  };

  /*
   * MARK ALL AS READ
   */
  const markAllNotificationsAsRead = () => {
    const allIds = notifications.map((notification) => notification.id);

    setReadNotificationIds(allIds);

    localStorage.setItem(
      "receptionistReadNotifications",
      JSON.stringify(allIds),
    );
  };

  /*
   * CLICK NOTIFICATION
   */
  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    setNotificationsOpen(false);

    if (notification.type === "inquiry") {
      navigate("/receptionist/inquiries");
      return;
    }

    if (notification.type === "booking") {
      navigate("/receptionist/reservations");
      return;
    }
  };

  /*
   * LOGOUT
   */
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");

    if (!confirmLogout) return;

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to log out.");
    }
  };

  /*
   * NAVIGATION
   */
  const handleNavigation = (id: (typeof NAV_ITEMS)[number]["id"]) => {
    if (id === "dashboard") {
      navigate("/receptionist");
    } else {
      navigate(`/receptionist/${id}`);
    }

    setSidebarOpen(false);
  };

  const currentPage =
    location.pathname.split("/").filter(Boolean).pop() || "dashboard";

  const currentNav = NAV_ITEMS.find((item) => item.id === currentPage);

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "#f0f9f8" }}
    >
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 ease-in-out lg:static lg:z-30 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "#0a2e2e",
        }}
      >
        <div
          className="flex flex-shrink-0 items-center gap-3 px-4 py-4 sm:px-5"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: "#14b8a6" }}
          >
            <Shell className="h-5 w-5" style={{ color: "#0a2e2e" }} />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-medium leading-tight text-white sm:text-base"
              style={{
                fontFamily: "Georgia, serif",
              }}
            >
              Sabang Diving Resort
            </div>

            <div
              className="truncate text-[11px] sm:text-xs"
              style={{ color: "#4a7a7a" }}
            >
              Resort & Dive Center
            </div>
          </div>

          <button
            type="button"
            className="flex-shrink-0 rounded-lg p-1.5 text-teal-300 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto py-3">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;

              const inquiryCount =
                item.id === "inquiries"
                  ? inquiries.filter(
                      (inquiry) =>
                        inquiry.read !== true &&
                        !readNotificationIds.includes(`inquiry-${inquiry.id}`),
                    ).length
                  : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigation(item.id)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5"
                  style={{
                    background: active
                      ? "rgba(20,184,166,0.15)"
                      : "transparent",
                    borderLeft: active
                      ? "3px solid #14b8a6"
                      : "3px solid transparent",
                    color: active ? "#14b8a6" : "#a0c4c4",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />

                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.label}
                  </span>

                  {item.id === "inquiries" && inquiryCount > 0 && (
                    <span
                      className="flex min-w-[20px] flex-shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                      style={{
                        background: "#f97316",
                        color: "#fff",
                      }}
                    >
                      {inquiryCount}
                    </span>
                  )}

                  {active && (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className="flex-shrink-0 px-4 py-3 sm:px-5 sm:py-4"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
              style={{
                background: "#0d7377",
                color: "#e2f3f2",
              }}
            >
              {userInitial}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white">{userName}</div>

              <div className="truncate text-xs" style={{ color: "#4a7a7a" }}>
                {userEmail}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex-shrink-0 rounded-lg p-1.5 transition-colors"
              style={{ color: "#4a7a7a" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f97316";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#4a7a7a";
              }}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="flex min-h-[64px] flex-shrink-0 items-center gap-2 border-b bg-white px-3 py-3 sm:gap-3 sm:px-4 md:px-6"
          style={{
            borderColor: "rgba(13,115,119,0.12)",
          }}
        >
          <button
            type="button"
            className="flex-shrink-0 rounded-lg p-2 lg:hidden"
            style={{ color: "#0d7377" }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-shrink-0">
            <h1
              className="truncate text-base sm:text-lg"
              style={{
                color: "#0a2e2e",
                fontFamily: "Georgia, serif",
                fontWeight: 400,
              }}
            >
              {currentNav?.label}
            </h1>
          </div>

          <div className="ml-2 hidden min-w-0 max-w-md flex-1 md:block">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "#4a7a7a" }}
              />

              <input
                type="text"
                placeholder="Search guests, bookings…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
          </div>

          <div className="ml-auto flex flex-shrink-0 items-center gap-1 sm:gap-3">
            {/* ========================= */}
            {/* NOTIFICATION BELL */}
            {/* ========================= */}

            <div className="relative">
              <button
                type="button"
                className="relative rounded-lg p-2 transition-colors hover:bg-[#f0f9f8]"
                style={{
                  color: "#0d7377",
                }}
                aria-label="Notifications"
                onClick={() => setNotificationsOpen((previous) => !previous)}
              >
                <Bell className="h-5 w-5" />

                {unreadNotificationCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{
                      background: "#f97316",
                    }}
                  >
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  className="absolute right-0 top-12 z-[100] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border bg-white shadow-xl"
                  style={{
                    borderColor: "rgba(13,115,119,0.15)",
                  }}
                >
                  {/* HEADER */}
                  <div
                    className="flex items-center justify-between border-b px-4 py-3"
                    style={{
                      borderColor: "rgba(13,115,119,0.12)",
                    }}
                  >
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{
                          color: "#0a2e2e",
                        }}
                      >
                        Notifications
                      </h3>

                      <p
                        className="text-xs"
                        style={{
                          color: "#4a7a7a",
                        }}
                      >
                        {unreadNotificationCount > 0
                          ? `${unreadNotificationCount} unread notification${
                              unreadNotificationCount !== 1 ? "s" : ""
                            }`
                          : "You're all caught up"}
                      </p>
                    </div>

                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        className="text-xs font-medium"
                        style={{
                          color: "#0d7377",
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* NOTIFICATION LIST */}
                  <div className="max-h-[380px] overflow-y-auto">
                    {displayedNotifications.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Bell
                          className="mx-auto mb-2 h-8 w-8"
                          style={{
                            color: "#a0c4c4",
                          }}
                        />

                        <p
                          className="text-sm"
                          style={{
                            color: "#4a7a7a",
                          }}
                        >
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      displayedNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-[#f0f9f8]"
                          style={{
                            borderColor: "rgba(13,115,119,0.08)",
                            background: notification.unread
                              ? "rgba(20,184,166,0.06)"
                              : "#fff",
                          }}
                        >
                          {/* ICON */}
                          <div
                            className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                              background:
                                notification.type === "booking"
                                  ? "rgba(20,184,166,0.12)"
                                  : "rgba(249,115,22,0.12)",
                            }}
                          >
                            {notification.type === "booking" ? (
                              <CalendarCheck
                                className="h-4 w-4"
                                style={{
                                  color: "#0d7377",
                                }}
                              />
                            ) : (
                              <MessageSquare
                                className="h-4 w-4"
                                style={{
                                  color: "#f97316",
                                }}
                              />
                            )}
                          </div>

                          {/* CONTENT */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className="truncate text-sm font-medium"
                                style={{
                                  color: "#0a2e2e",
                                }}
                              >
                                {notification.type === "booking"
                                  ? "New Booking"
                                  : "New Inquiry"}
                              </p>

                              {notification.unread && (
                                <span
                                  className="h-2 w-2 flex-shrink-0 rounded-full"
                                  style={{
                                    background: "#f97316",
                                  }}
                                />
                              )}
                            </div>

                            <p
                              className="mt-0.5 truncate text-sm"
                              style={{
                                color: "#0a2e2e",
                              }}
                            >
                              {notification.title}
                            </p>

                            <p
                              className="mt-0.5 line-clamp-2 text-xs"
                              style={{
                                color: "#4a7a7a",
                              }}
                            >
                              {notification.message}
                            </p>

                            {notification.type === "booking" &&
                              (() => {
                                const booking = bookings.find(
                                  (item) => item.id === notification.bookingId,
                                );

                                if (!booking) return null;

                                return (
                                  <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11px]">
                                    <span
                                      style={{
                                        color: "#0d7377",
                                      }}
                                    >
                                      {booking.checkIn || "No check-in"}
                                    </span>

                                    <span
                                      style={{
                                        color: "#a0a0a0",
                                      }}
                                    >
                                      →
                                    </span>

                                    <span
                                      style={{
                                        color: "#0d7377",
                                      }}
                                    >
                                      {booking.checkOut || "No check-out"}
                                    </span>

                                    {booking.status && (
                                      <span
                                        className="rounded-full px-1.5 py-0.5"
                                        style={{
                                          background:
                                            booking.status === "pending"
                                              ? "#fff7ed"
                                              : "#f0f9f8",
                                          color:
                                            booking.status === "pending"
                                              ? "#c2410c"
                                              : "#0d7377",
                                        }}
                                      >
                                        {booking.status}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* FOOTER */}
                  <div
                    className="border-t p-2"
                    style={{
                      borderColor: "rgba(13,115,119,0.12)",
                    }}
                  >
                    <button
                      type="button"
                      className="w-full rounded-lg py-2 text-center text-sm font-medium transition-colors hover:bg-[#f0f9f8]"
                      style={{
                        color: "#0d7377",
                      }}
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/receptionist/reservations");
                      }}
                    >
                      View reservations
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* USER */}
            <div className="hidden items-center gap-2 sm:flex">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium"
                style={{
                  background: "#0d7377",
                  color: "#e2f3f2",
                }}
              >
                {userInitial}
              </div>

              <span
                className="max-w-[140px] truncate text-sm"
                style={{
                  color: "#0a2e2e",
                }}
              >
                {userName}
              </span>
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
          <div className="w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
