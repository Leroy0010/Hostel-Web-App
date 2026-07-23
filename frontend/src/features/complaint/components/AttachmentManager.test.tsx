import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { AttachmentManager } from './AttachmentManager';
import type { AttachmentDto } from '../types/complaint.types';

const mockAdd = vi.fn();
const mockDelete = vi.fn();
const mockUpload = vi.fn();

vi.mock('../hooks/complaint.hooks', () => ({
    useAddAttachment: () => ({ mutate: mockAdd, isPending: false }),
    useDeleteAttachment: () => ({ mutate: mockDelete, isPending: false }),
}));

vi.mock('@/services/cloudinary.service', () => ({
    handleUploadImage: (...args: unknown[]) => mockUpload(...args),
}));

const COMPLAINT_ID = 'complaint-1';
const CURRENT_USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

const ownImageAttachment: AttachmentDto = {
    id: 'att-1',
    fileUrl: 'https://example.com/photo.jpg',
    fileType: 'image/jpeg',
    submittedById: CURRENT_USER_ID,
    uploadedAt: '2025-06-01T10:00:00.000Z',
};

const othersFileAttachment: AttachmentDto = {
    id: 'att-2',
    fileUrl: 'https://example.com/report.pdf',
    fileType: 'application/pdf',
    submittedById: OTHER_USER_ID,
    uploadedAt: '2025-06-01T10:00:00.000Z',
};

function selectFile(input: HTMLElement, file: File) {
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('AttachmentManager', () => {
    beforeEach(() => {
        mockAdd.mockClear();
        mockDelete.mockClear();
        mockUpload.mockClear();
    });

    it('shows a "no attachments" message when there are none', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canAdd={false}
                currentUserId={CURRENT_USER_ID}
            />
        );
        expect(screen.getByText('No attachments yet.')).toBeInTheDocument();
        expect(screen.getByText('Attachments (0)')).toBeInTheDocument();
    });

    it('renders an image thumbnail for image attachments and a file chip for others', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[ownImageAttachment, othersFileAttachment]}
                canAdd={false}
                currentUserId={CURRENT_USER_ID}
            />
        );
        expect(screen.getByAltText('Attachment')).toBeInTheDocument();
        expect(screen.getByText('application/pdf')).toBeInTheDocument();
        expect(screen.getByText('Attachments (2)')).toBeInTheDocument();
    });

    it('hides the Add button when canAdd is false', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[othersFileAttachment]}
                canAdd={false}
                currentUserId={CURRENT_USER_ID}
            />
        );
        expect(
            screen.queryByRole('button', { name: /^add$/i })
        ).not.toBeInTheDocument();
    });

    it('shows the Add button when canAdd is true', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canAdd
                currentUserId={CURRENT_USER_ID}
            />
        );
        expect(
            screen.getByRole('button', { name: /^add$/i })
        ).toBeInTheDocument();
    });

    it('only shows the remove control on attachments submitted by the current user', () => {
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[ownImageAttachment, othersFileAttachment]}
                canAdd
                currentUserId={CURRENT_USER_ID}
            />
        );
        // Only one remove control — for the attachment the current user submitted.
        expect(
            screen.getAllByRole('button', { name: /remove attachment/i })
        ).toHaveLength(1);
    });

    it('calls the delete mutation with the attachment id when removed', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[ownImageAttachment]}
                canAdd
                currentUserId={CURRENT_USER_ID}
            />
        );

        await user.click(
            screen.getByRole('button', { name: /remove attachment/i })
        );
        expect(mockDelete).toHaveBeenCalledWith('att-1');
    });

    it('uploads the selected file to Cloudinary and submits the resulting URL', async () => {
        mockUpload.mockResolvedValue('https://res.cloudinary.com/demo/new.png');
        mockAdd.mockImplementation(
            (_payload, opts) => opts?.onError === undefined && undefined
        );

        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canAdd
                currentUserId={CURRENT_USER_ID}
            />
        );

        const file = new File(['data'], 'evidence.png', { type: 'image/png' });
        const input = document.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        selectFile(input, file);

        await waitFor(() =>
            expect(mockUpload).toHaveBeenCalledWith(file, 'complaints')
        );
        await waitFor(() =>
            expect(mockAdd).toHaveBeenCalledWith(
                {
                    fileUrl: 'https://res.cloudinary.com/demo/new.png',
                    fileType: 'image/png',
                },
                expect.anything()
            )
        );
    });

    it('shows an error message when the Cloudinary upload fails', async () => {
        mockUpload.mockRejectedValue(new Error('network error'));

        renderWithProviders(
            <AttachmentManager
                complaintId={COMPLAINT_ID}
                attachments={[]}
                canAdd
                currentUserId={CURRENT_USER_ID}
            />
        );

        const file = new File(['data'], 'evidence.png', { type: 'image/png' });
        const input = document.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        selectFile(input, file);

        expect(
            await screen.findByText('Upload failed. Please try again.')
        ).toBeInTheDocument();
        expect(mockAdd).not.toHaveBeenCalled();
    });
});
