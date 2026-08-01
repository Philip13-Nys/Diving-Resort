import { Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

const stats = [
  { label: 'Pending Check-ins', value: '12', color: 'bg-blue-100 text-blue-700' },
  { label: 'Pending Check-outs', value: '8', color: 'bg-orange-100 text-orange-700' },
  { label: 'Active Reservations', value: '45', color: 'bg-green-100 text-green-700' },
  { label: 'Completed Today', value: '23', color: 'bg-purple-100 text-purple-700' },
];

const recentTransactions = [
  {
    id: 'TXN-001',
    guest: 'John Anderson',
    room: '101',
    type: 'Check-in',
    amount: '$450',
    status: 'completed',
    time: '10:30 AM',
  },
  {
    id: 'TXN-002',
    guest: 'Maria Garcia',
    room: '205',
    type: 'Payment',
    amount: '$1,200',
    status: 'completed',
    time: '11:15 AM',
  },
  {
    id: 'TXN-003',
    guest: 'Robert Kim',
    room: '308',
    type: 'Check-out',
    amount: '$890',
    status: 'pending',
    time: '11:45 AM',
  },
  {
    id: 'TXN-004',
    guest: 'Sophie Turner',
    room: '152',
    type: 'Booking',
    amount: '$320',
    status: 'completed',
    time: '12:20 PM',
  },
];

const upcomingReservations = [
  { name: 'Alex Thompson', room: '201', checkIn: 'Today 2:00 PM', nights: 3 },
  { name: 'Emily Chen', room: '305', checkIn: 'Today 3:30 PM', nights: 5 },
  { name: 'Michael Brown', room: '412', checkIn: 'Today 4:00 PM', nights: 2 },
  { name: 'Jessica Lee', room: '207', checkIn: 'Tomorrow 10:00 AM', nights: 7 },
];

export default function ReceptionistDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Oversee receptionist operations, reservations, and customer transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`size-12 rounded-full ${stat.color} flex items-center justify-center`}>
                <Calendar className="size-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {recentTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{txn.guest}</span>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                      Room {txn.room}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{txn.type}</span>
                    <span>•</span>
                    <span className="font-semibold text-gray-900">{txn.amount}</span>
                    <span>•</span>
                    <span>{txn.time}</span>
                  </div>
                </div>
                {txn.status === 'completed' ? (
                  <CheckCircle className="size-5 text-green-600" />
                ) : (
                  <Clock className="size-5 text-orange-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Check-ins</h3>
          <div className="space-y-3">
            {upcomingReservations.map((reservation, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="size-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-semibold">
                  {reservation.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{reservation.name}</p>
                  <p className="text-sm text-gray-600">Room {reservation.room}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="size-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{reservation.checkIn}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{reservation.nights} nights</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <AlertCircle className="size-12" />
          <div>
            <h3 className="text-lg font-semibold">Quick Actions Available</h3>
            <p className="text-cyan-50 mt-1">
              Process check-ins, handle payments, manage reservations, and assist guests
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
