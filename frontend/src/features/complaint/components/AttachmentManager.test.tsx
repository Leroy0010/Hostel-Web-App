import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { AttachmentManager } from './AttachmentManager';
import type { AttachmentDto } from '../types/complaint.types';

const mockAdd = vi.fn();
const mockDelete = vi.fn();

vi.mock('../hooks/complaint.hooks', () => ({
    useAddAttachment: () => ({ mutate: mockAdd, isPending: false }),
    useDeleteAttachment: () => ({ mutate: mockDelete, isPending: false }),
}));

const COMPLAINT_ID = 'complaint-1';

const imageAttachment: AttachmentDto = {
    id: 'att-1',
    fileUrl: 'https://example.com/photo.jpg',
    fileType: 'image/jpeg',
    uploadedAt: '2025-06-01T10:00:00.000Z',
};

const fileAttachment: AttachmentDto = {
    id: 'att-2',
    fileUrl: 'https://example.com/report.pdf',
    fileType: 'application/pdf',
    uploadedAt: '2025-06-01T10:00:00.000Z',
};

describe('AttachmentManager', () => {
    beforeEach(() => {
        mockAdd.mockClear();
        mockDelete.mockClear();
    });

    it('shows a "no attachments" message when there are none', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canManage={false}
            />
        );
        expect(screen.getByText('No attachments yet.')).toBeInTheDocument();
        expect(screen.getByText('Attachments (0)')).toBeInTheDocument();
    });

    it('renders an image thumbnail for image attachments and a file chip for others', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[imageAttachment, fileAttachment]}
                canManage={false}
            />
        );
        expect(screen.getByAltText('Attachment')).toBeInTheDocument();
        expect(screen.getByText('application/pdf')).toBeInTheDocument();
        expect(screen.getByText('Attachments (2)')).toBeInTheDocument();
    });

    it('hides the Add button and remove controls when canManage is false', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[fileAttachment]}
                canManage={false}
            />
        );
        expect(
            screen.queryByRole('button', { name: /^add$/i })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /remove attachment/i })
        ).not.toBeInTheDocument();
    });

    it('shows the Add button and remove controls when canManage is true', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[fileAttachment]}
                canManage
            />
        );
        expect(
            screen.getByRole('button', { name: /^add$/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /remove attachment/i })
        ).toBeInTheDocument();
    });

    it('calls the delete mutation with the attachment id when removed', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[fileAttachment]}
                canManage
            />
        );

        await user.click(
            screen.getByRole('button', { name: /remove attachment/i })
        );
        expect(mockDelete).toHaveBeenCalledWith('att-2');
    });

    it('toggles the add-attachment form open and closed', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canManage
            />
        );

        expect(screen.queryByLabelText('File URL')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^add$/i }));
        expect(await screen.findByLabelText('File URL')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /^cancel$/i })
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^cancel$/i }));
        await waitFor(() =>
            expect(screen.queryByLabelText('File URL')).not.toBeInTheDocument()
        );
    });

    it('validates the file URL before submitting', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canManage
            />
        );

        await user.click(screen.getByRole('button', { name: /^add$/i }));
        await user.type(
            await screen.findByLabelText('File URL'),
            'not-a-valid-url'
        );
        await user.click(screen.getByRole('button', { name: /^add$/i }));

        expect(
            await screen.findByText('Must be a valid URL')
        ).toBeInTheDocument();
        expect(mockAdd).not.toHaveBeenCalled();
    });

    it('submits the file URL and optional type, then closes the form on success', async () => {
        const user = userEvent.setup();
        mockAdd.mockImplementation((_payload, { onSuccess }) => onSuccess());

        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canManage
            />
        );

        await user.click(screen.getByRole('button', { name: /^add$/i }));
        await user.type(
            await screen.findByLabelText('File URL'),
            'https://example.com/new.png'
        );
        await user.type(screen.getByLabelText(/type/i), 'image/png');

        // Two "Add"-labelled controls exist now (the toggle became "Cancel",
        // so only the form's submit button matches "Add").
        await user.click(screen.getByRole('button', { name: /^add$/i }));

        await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
        expect(mockAdd.mock.calls[0][0]).toEqual({
            fileUrl: 'https://example.com/new.png',
            fileType: 'image/png',
        });

        await waitFor(() =>
            expect(screen.queryByLabelText('File URL')).not.toBeInTheDocument()
        );
    });
});
