package com.leroy.hostelbackend.shared.exception;

public class UserDeactivatedException extends RuntimeException {
    public UserDeactivatedException(String s) {
        super(s);
    }
}
