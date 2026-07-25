package com.leroy.hostelbackend.module.waitlist.specification;

import com.leroy.hostelbackend.module.room.model.RoomType;
import com.leroy.hostelbackend.module.waitlist.model.Waitlist;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;
import java.util.UUID;

public class WaitlistSpecifications {

    public static Specification<Waitlist> filterWaitlist(
            UUID hostelId,
            RoomType roomType,
            String academicYear,
            String semester
    ) {
        return (root, query, cb) -> {
            // Eagerly fetch student relation for the data query, but skip for count queries
            if (Long.class != query.getResultType()) {
                root.fetch("student", JoinType.INNER);
            }

            return cb.and(
                    hostelId == null     ? cb.conjunction() : cb.equal(root.get("hostel").get("id"), hostelId),
                    roomType == null     ? cb.conjunction() : cb.equal(root.get("roomType"), roomType),
                    academicYear == null ? cb.conjunction() : cb.equal(root.get("academicYear"), academicYear),
                    semester == null     ? cb.conjunction() : cb.equal(root.get("semester"), semester)
            );
        };
    }
}
