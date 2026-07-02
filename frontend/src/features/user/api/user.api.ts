import { apiClient } from "@/lib/axios";
import type { MeResponse, UserSummary } from "../types/user.types";

export function getManagers(): Promise<UserSummary[]> {
    return apiClient.get('/users/managers');
}

export function getProfile(): Promise<MeResponse> {
    return apiClient.get('/users/me')
}


export function updateProfileUrl(profileUrl: string): Promise<void> {
    return apiClient.patch('/users/me/profile-url', { profileUrl });
}