package com.leroy.hostelbackend.module.room.specification;

import com.leroy.hostelbackend.module.room.model.Room;
import com.leroy.hostelbackend.module.room.model.RoomStatus;
import com.leroy.hostelbackend.module.room.model.RoomType;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class RoomSpecifications {

    public static Specification<Room> filterRooms(
            UUID hostelId,
            RoomType roomType,
            BigDecimal maxPrice
    ) {

        return (root, query, cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            if (query.getResultType() != Long.class &&
                    query.getResultType() != long.class) {
                root.fetch("hostel", JoinType.INNER);
                query.distinct(true);
            }

            predicates.add(
                    cb.equal(root.get("hostel").get("id"), hostelId)
            );

            predicates.add(
                    cb.equal(root.get("status"), RoomStatus.AVAILABLE)
            );

            if (roomType != null) {
                predicates.add(
                        cb.equal(root.get("roomType"), roomType)
                );
            }

            if (maxPrice != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("pricePerSemester"),
                                maxPrice
                        )
                );
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}