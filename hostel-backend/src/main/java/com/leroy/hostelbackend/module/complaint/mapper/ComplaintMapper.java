package com.leroy.hostelbackend.module.complaint.mapper;

import com.leroy.hostelbackend.module.complaint.dto.*;
import com.leroy.hostelbackend.module.complaint.model.Complaint;
import com.leroy.hostelbackend.module.complaint.model.ComplaintAttachment;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ComplaintMapper {

    @Mapping(target = "author",      source = "complaint.author")
    @Mapping(target = "hostelId",    source = "complaint.hostel.id")
    @Mapping(target = "hostelName",  source = "complaint.hostel.name")
    @Mapping(target = "roomId",      source = "complaint.room.id")
    @Mapping(target = "roomNumber",  source = "complaint.room.roomNumber")
    @Mapping(target = "status",      source = "complaint.status")
    @Mapping(target = "category",    source = "complaint.category")
    @Mapping(target = "upvotes",     ignore = true)
    @Mapping(target = "downvotes",   ignore = true)
    @Mapping(target = "netScore",    ignore = true)
    @Mapping(target = "currentUserVote", ignore = true)
    @Mapping(target = "attachments", source = "attachments")
    ComplaintDto toDto(Complaint complaint, List<AttachmentDto> attachments);

    @Mapping(target = "id",        source = "id")
    @Mapping(target = "firstName", source = "firstName")
    @Mapping(target = "lastName",  source = "lastName")
    ComplaintDto.AuthorSummary toAuthorSummary(com.leroy.hostelbackend.module.user.model.User user);

    AttachmentDto toAttachmentDto(ComplaintAttachment attachment);

    List<AttachmentDto> toAttachmentDtos(List<ComplaintAttachment> attachments);
}