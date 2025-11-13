import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User2 } from "lucide-react";

interface Room {
  roomNumber: string;
  doctorName?: string;
  doctorId?: string;
}

interface FloorPlanProps {
  assignedRooms: Room[];
}

export default function FloorPlan({ assignedRooms }: FloorPlanProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const rooms = [
    { roomNumber: "101A" },
    { roomNumber: "102B" },
    { roomNumber: "103C" },
    { roomNumber: "201A" },
    { roomNumber: "202B" },
    { roomNumber: "301C" }
  ];

  const handleRoomClick = (roomNumber: string) => {
    const assigned = assignedRooms.find((r) => r.roomNumber === roomNumber);
    setSelectedRoom(
      selectedRoom?.roomNumber === roomNumber ? null : assigned || null
    );
  };

  return (
    <div className="relative flex flex-col items-center">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">
        🏥 Hospital Floor Plan
      </h2>

      <div className="relative grid grid-cols-2 md:grid-cols-3 gap-10 bg-gray-800 p-10 rounded-3xl border border-gray-700 shadow-2xl w-full max-w-5xl justify-items-center">
        {rooms.map((room) => {
          const assigned = assignedRooms.find(
            (r) => r.roomNumber === room.roomNumber
          );
          return (
            <div
              key={room.roomNumber}
              onClick={() => handleRoomClick(room.roomNumber)}
              className={`relative flex items-center justify-center h-44 w-64 rounded-2xl cursor-pointer transition-all duration-200
                ${assigned ? "bg-amber-600 hover:bg-amber-500" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              <span className="text-white text-lg font-semibold">
                {room.roomNumber}
              </span>

              {/* Show icon if occupied */}
              {assigned && (
                <User2
                  className="absolute bottom-3 right-3 text-white opacity-90"
                  size={28}
                />
              )}

              {/* Popup */}
              <AnimatePresence>
                {selectedRoom?.roomNumber === room.roomNumber && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.25 }}
                    className="absolute -top-28 left-1/2 -translate-x-1/2 bg-gray-900 text-white p-4 rounded-xl border border-amber-500 shadow-xl w-60 z-50 text-center"
                  >
                    <p className="font-semibold text-amber-400 text-sm mb-1">
                      Room Occupied
                    </p>
                    <p className="text-sm">{selectedRoom.doctorName}</p>
                    <p className="text-xs text-gray-400">
                      ID: {selectedRoom.doctorId}
                    </p>

                    {/* Tail */}
                    <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 border-l border-b border-amber-500 rotate-45"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
