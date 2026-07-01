package com.leroy.hostelbackend.module.review.mapper;

import com.leroy.hostelbackend.module.review.dto.*;
import com.leroy.hostelbackend.module.review.model.Review;
import com.leroy.hostelbackend.module.user.model.User;
import org.mapstruct.*;

/**
 * MapStruct mapper for {@link Review} ↔ DTO conversions.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ReviewMapper {

    /**
     * Full review detail. All nested objects (author, hostel name, booking id)
     * are mapped from the eagerly-loaded entity associations.
     */
    @Mapping(target = "hostelId",   source = "hostel.id")
    @Mapping(target = "hostelName", source = "hostel.name")
    @Mapping(target = "bookingId",  source = "booking.id")
    ReviewDto toDto(Review review);

    /** Nested author summary inside ReviewDto. */
    @Mapping(target = "id",        source = "id")
    @Mapping(target = "firstName", source = "firstName")
    @Mapping(target = "lastName",  source = "lastName")
    ReviewDto.AuthorSummary toAuthorSummary(User author);

    /** Lightweight summary for paginated lists embedded in hostel pages. */
    @Mapping(target = "authorId",   source = "author.id")
    @Mapping(target = "authorName",
            expression = "java(review.getAuthor().getFirstName() + ' ' + review.getAuthor().getLastName())")
    @Mapping(target = "hostelId", source = "hostel.id")
    ReviewSummaryDto toSummaryDto(Review review);
}