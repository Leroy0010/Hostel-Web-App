import { motion } from 'framer-motion';
import { ArrowRight, BedDouble, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const hostels = [
    {
        id: '1',
        name: 'Unity Hall',
        address: 'Kumasi Campus',
        rooms: [
            {
                id: 'r1',
                roomNumber: 'A101',
                type: '4-in-1',
                bedsLeft: 2,
                price: 3500,
                image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304',
            },
            {
                id: 'r2',
                roomNumber: 'A102',
                type: '2-in-1',
                bedsLeft: 1,
                price: 4500,
                image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a',
            },
            {
                id: 'r3',
                roomNumber: 'A103',
                type: '1-in-1',
                bedsLeft: 0,
                price: 6000,
                image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
            },
        ],
    },
    {
        id: '2',
        name: 'Republic Hall',
        address: 'Main Campus',
        rooms: [
            {
                id: 'r4',
                roomNumber: 'B201',
                type: '4-in-1',
                bedsLeft: 3,
                price: 3200,
                image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
            },
            {
                id: 'r5',
                roomNumber: 'B202',
                type: '2-in-1',
                bedsLeft: 1,
                price: 4700,
                image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a',
            },
        ],
    },
];

export default function HostelsPage() {
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
                        Hostels
                    </h1>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                        Browse available hostels and room previews
                    </p>
                </div>

                <div className="space-y-8">
                    {hostels.map((hostel, index) => (
                        <motion.div
                            key={hostel.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: index * 0.1,
                                duration: 0.25,
                            }}
                            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
                        >
                            <div className="border-b border-gray-200 p-5 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-primary" />
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                {hostel.name}
                                            </h2>
                                        </div>

                                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                            <MapPin className="h-4 w-4" />
                                            {hostel.address}
                                        </div>
                                    </div>

                                    <Button variant="ghost" size="sm">
                                        View All
                                    </Button>
                                </div>
                            </div>

                            <div className="scrollbar-none overflow-x-auto">
                                <div className="flex snap-x snap-mandatory gap-4 p-4">
                                    {hostel.rooms.map((room) => (
                                        <motion.div
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            key={room.id}
                                            className="w-70 shrink-0 cursor-pointer snap-start overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                                        >
                                            <img
                                                src={room.image}
                                                alt=""
                                                className="h-40 w-full object-cover"
                                            />

                                            <div className="p-4">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold">
                                                        {room.roomNumber}
                                                    </span>

                                                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                                                        {room.type}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                                    <BedDouble className="h-4 w-4" />
                                                    {room.bedsLeft} beds left
                                                </div>

                                                <div className="mt-4 text-lg font-bold">
                                                    ₵{room.price}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}

                                    <motion.div
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex w-45 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700"
                                    >
                                        <ArrowRight className="mb-2 h-6 w-6" />

                                        <span className="text-sm font-medium">
                                            See More Rooms
                                        </span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
