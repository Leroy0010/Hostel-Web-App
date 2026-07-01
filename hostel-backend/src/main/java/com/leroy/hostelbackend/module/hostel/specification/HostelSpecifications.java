package com.leroy.hostelbackend.module.hostel.specification;

import com.leroy.hostelbackend.module.hostel.model.GenderPolicy;
import com.leroy.hostelbackend.module.hostel.model.Hostel;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class HostelSpecifications {

    public static Specification<Hostel> filterHostels(String search, String genderPolicyStr, Boolean isActive) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // N+1 Prevention: Only fetch join the manager association for data queries.
            // Spring Data JPA executes a COUNT query for pagination; fetch joins on count queries throw exceptions.
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("manager", JoinType.LEFT);
            }

            // 1. Soft-delete status filter
            if (isActive != null) {
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }

            // 2. Full-text search (Name OR Address) - Case Insensitive & Null Safe
            if (search != null && !search.isBlank()) {
                String safeSearchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), safeSearchPattern);
                Predicate addressLike = cb.like(cb.lower(root.get("address")), safeSearchPattern);

                predicates.add(cb.or(nameLike, addressLike));
            }

            // 3. Gender Policy mapping (Gracefully handles 'ALL')
            if (genderPolicyStr != null && !genderPolicyStr.equalsIgnoreCase("ALL") && !genderPolicyStr.trim().isEmpty()) {
                try {
                    GenderPolicy policy = GenderPolicy.valueOf(genderPolicyStr.toUpperCase());
                    predicates.add(cb.equal(root.get("genderPolicy"), policy));
                } catch (IllegalArgumentException e) {
                    // Log or handle invalid enum string mapping quietly to keep queries resilient
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}