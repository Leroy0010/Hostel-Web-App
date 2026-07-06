package com.leroy.hostelbackend.testsupport;

import com.leroy.hostelbackend.module.booking.model.Booking;
import com.leroy.hostelbackend.module.booking.model.BookingStatus;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.user.model.User;
import com.leroy.hostelbackend.module.user.model.UserRole;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Builds minimally-valid domain entities for unit tests.
 *
 * <p>These are plain in-memory objects (no persistence context involved) —
 * every {@code @Id} is assigned manually via the entity's Lombok setter,
 * exactly as Hibernate would populate it after an insert, so service-layer
 * code that reads {@code getId()} on an association behaves identically to
 * production.
 */
public final class TestFixtures {

    private TestFixtures() {
    }

    public static User student(String firstName, String lastName) {
        var user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(firstName.toLowerCase() + "." + lastName.toLowerCase() + "@ucc.edu.gh");
        user.setPassword("hashed-password");
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole(UserRole.STUDENT);
        return user;
    }

    public static User manager(String firstName, String lastName) {
        var user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(firstName.toLowerCase() + "." + lastName.toLowerCase() + "@leroy.com");
        user.setPassword("hashed-password");
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole(UserRole.MANAGER);
        return user;
    }

    public static Hostel hostel(String name) {
        var hostel = new Hostel();
        hostel.setId(UUID.randomUUID());
        hostel.setName(name);
        hostel.setAddress("1 Campus Road, Cape Coast");
        return hostel;
    }

    public static Room room(Hostel hostel, RoomType roomType, int capacity, int currentOccupancy) {
        var room = new Room();
        room.setId(UUID.randomUUID());
        room.setHostel(hostel);
        room.setRoomNumber("A-" + (100 + (int) (Math.random() * 900)));
        room.setRoomType(roomType);
        room.setCapacity((short) capacity);
        room.setCurrentOccupancy((short) currentOccupancy);
        room.setPricePerSemester(new BigDecimal("1500.00"));
        room.setStatus(RoomStatus.AVAILABLE);
        room.setVersion(0);
        return room;
    }

    /** A booking with sensible defaults; override specific fields with the returned instance's setters. */
    public static Booking booking(User student, Room room, BookingStatus status,
                                  String academicYear, String semester) {
        var booking = new Booking();
        booking.setId(UUID.randomUUID());
        booking.setStudent(student);
        booking.setRoom(room);
        booking.setStatus(status);
        booking.setAcademicYear(academicYear);
        booking.setSemester(semester);
        booking.setRequestedAt(LocalDateTime.now().minusDays(1));
        booking.setIsWaitlistDraft(false);
        return booking;
    }
}
