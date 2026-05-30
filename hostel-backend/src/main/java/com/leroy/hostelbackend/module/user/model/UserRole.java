package com.leroy.hostelbackend.module.user.model;

/**
 * Roles available to system users.
 * Maps to: users.role (VARCHAR 20)
 *<p>
 * Spring Security uses these as GrantedAuthority values prefixed with ROLE_:<p>
 *   hasRole('ADMIN')    checks for "ROLE_ADMIN"<p>
 *   hasRole('MANAGER')  checks for "ROLE_MANAGER"<p>
 *   hasRole('STUDENT')  checks for "ROLE_STUDENT"
 */
public enum UserRole {
    /** Full system control — creates manager accounts, resolves disputes globally. */
    ADMIN,

    /** Assigned to one or more hostels — approves/rejects bookings, manages rooms. */
    MANAGER,

    /** Default role — books rooms, raises complaints, leaves reviews. */
    STUDENT
}
