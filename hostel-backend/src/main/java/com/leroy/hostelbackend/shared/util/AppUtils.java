package com.leroy.hostelbackend.shared.util;


public final class AppUtils {
    public static String toTitleCase(String str) {
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}
