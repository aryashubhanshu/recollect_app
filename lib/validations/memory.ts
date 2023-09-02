import * as z from 'zod'

export const MemoryValidation = z.object({
    memory: z.string().nonempty().min(3, {message: 'Minimum 3 characters'}),
    accountId: z.string(),
})

export const CommentValidation = z.object({
    memory: z.string().nonempty().min(3, {message: 'Minimum 3 characters'}),
})