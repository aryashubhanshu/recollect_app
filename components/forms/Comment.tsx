"use client"

import { z } from 'zod'
import Image from 'next/image'
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "../ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { usePathname } from "next/navigation"

import { CommentValidation } from "@/lib/validations/memory"
import { addCommentToMemory } from '@/lib/actions/memory.actions'

interface Props {
    memoryId: string;
    currentUserImg: string;
    currentUserId: string;
}

function Comment ( { memoryId, currentUserImg, currentUserId }: Props ) {
    const pathname  = usePathname();

    const form = useForm<z.infer<typeof CommentValidation>>({
        resolver: zodResolver(CommentValidation),
        defaultValues: {
            memory: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof CommentValidation>) => {
        await addCommentToMemory(
            memoryId, values.memory, JSON.parse(currentUserId), pathname
        );

        form.reset();
    }

    return (
        <Form {...form}>
            <form 
                onSubmit={form.handleSubmit(onSubmit)} 
                className="comment-form"
            >
                <FormField
                    control={form.control}
                    name="memory"
                    render={({ field }) => (
                        <FormItem className="flex w-full items-center gap-3">
                        <FormLabel>
                            <Image src={currentUserImg} alt="current_user" width={48} height={48} className="rounded-full object-cover" />
                        </FormLabel>
                        <FormControl className="border-none bg-transparent">
                            <Input
                                type="text"
                                {...field}
                                placeholder='Comment...'
                                className="no-focus text-light-1 outline-none"
                            />
                        </FormControl>
                        </FormItem>
                    )}
                />

                <Button type="submit" className="comment-form_btn">Reply</Button>
            </form>
        </Form>
    )
}

export default Comment;