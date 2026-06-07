import { motion } from 'framer-motion';
import { Users, Wifi, Tv, Bath } from 'lucide-react';
import { Button } from '@/components/ui/button';

const rooms = [
    {
        id: '1',
        roomNumber: 'A101',
        type: '4-in-1',
        price: 3500,
        occupancy: 2,
        capacity: 4,
        status: 'AVAILABLE',
        image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304',
        amenities: [
            { icon: Wifi, name: 'WiFi' },
            { icon: Tv, name: 'TV' },
            { icon: Bath, name: 'Bathroom' },
        ],
    },
    {
        id: '2',
        roomNumber: 'A102',
        type: '2-in-1',
        price: 4500,
        occupancy: 2,
        capacity: 2,
        status: 'FULL',
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
        amenities: [
            { icon: Wifi, name: 'WiFi' },
            { icon: Bath, name: 'Bathroom' },
        ],
    },
];

export default function RoomsPage() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-gray-50 transition-colors duration-200 dark:bg-gray-900"
        >
            <div className="mx-auto max-w-7xl p-4 md:p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Rooms
                    </h1>

                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                        Browse available rooms
                    </p>
                </div>

                <div className="space-y-5">
                    {rooms.map((room, index) => (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: index * 0.1,
                                duration: 0.25,
                            }}
                            whileHover={{ y: -2 }}
                            className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                        >
                            <div className="md:flex">
                                <img
                                    src={room.image}
                                    alt=""
                                    className="h-64 object-cover md:h-auto md:w-72"
                                />

                                <div className="flex-1 p-5">
                                    <div className="flex justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold">
                                                Room {room.roomNumber}
                                            </h3>

                                            <p className="text-sm text-gray-500">
                                                {room.type}
                                            </p>
                                        </div>

                                        <div className="text-xl font-bold">
                                            ₵{room.price}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                                        <Users className="h-4 w-4" />
                                        {room.capacity - room.occupancy} slots
                                        available
                                    </div>

                                    <div className="mt-5">
                                        <div className="scrollbar-none overflow-x-auto">
                                            <div className="flex gap-2">
                                                {room.amenities.map(
                                                    (amenity) => {
                                                        const Icon =
                                                            amenity.icon;

                                                        return (
                                                            <div
                                                                key={
                                                                    amenity.name
                                                                }
                                                                className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
                                                            >
                                                                <Icon className="h-4 w-4" />

                                                                <span className="text-sm">
                                                                    {
                                                                        amenity.name
                                                                    }
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between">
                                        <span
                                            className={`text-sm font-medium ${
                                                room.status === 'AVAILABLE'
                                                    ? 'text-green-600'
                                                    : 'text-red-500'
                                            }`}
                                        >
                                            {room.status}
                                        </span>

                                        <Button>View Details</Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
