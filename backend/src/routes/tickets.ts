import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { TicketController } from '../controllers/ticket.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Setup Multer for attachments
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(requireAuth());

// Ticket routes
router.get('/', TicketController.getAll);
router.get('/:id', TicketController.getById);
router.post('/', TicketController.create);
router.put('/:id', TicketController.update);
router.delete('/:id', TicketController.delete);

// Note routes
router.post('/:id/notes', TicketController.addNote);

// Attachment upload route
router.post('/:id/attachments', upload.single('file'), TicketController.uploadAttachment);

export default router;
