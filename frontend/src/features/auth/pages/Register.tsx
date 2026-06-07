import { RegisterStudentForm } from '../components/RegisterStudentForm';

/**
 * Student self-registration page.
 *
 * Thin wrapper — kept minimal so lazy-loading splits this chunk cleanly.
 * All logic lives inside {@link RegisterStudentForm}.
 *
 * Route: `GET /register` (public — wrapped by PublicRoute)
 */
export default function Register() {
    return <RegisterStudentForm />;
}
