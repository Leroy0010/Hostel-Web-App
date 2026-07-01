package com.leroy.hostelbackend.module.map.specification;

import com.leroy.hostelbackend.module.map.model.Landmark;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class LandmarkSpecification {

    public static Specification<Landmark> filterLandmarks(String category, String search){
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if( category != null ) predicates.add(cb.equal(root.get("category"), category));

            if (search != null && !search.isBlank()){
                String safeSearchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), safeSearchPattern);

                predicates.add(nameLike);
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
