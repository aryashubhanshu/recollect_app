"use client"

import * as z from 'zod'
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Textarea } from "../ui/textarea"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { usePathname, useRouter } from "next/navigation"
import { MemoryValidation } from "@/lib/validations/memory"
import { createMemory } from '@/lib/actions/memory.actions'
import { useOrganization } from '@clerk/nextjs'

interface Props {
    userId: string;
}

function PostMemory({ userId }: Props) {
    const router = useRouter();
    const pathname  = usePathname();
    const { organization } = useOrganization();

    const form = useForm<z.infer<typeof MemoryValidation>>({
        resolver: zodResolver(MemoryValidation),
        defaultValues: {
            memory: '',
            accountId: userId,
        }
    });

    const onSubmit = async (values: z.infer<typeof MemoryValidation>) => {
        await createMemory({
            text: values.memory,
            author: userId,
            communityId: organization ? organization.id : null,
            path: pathname
        });

        router.push("/");
    };

    return (
        <Form {...form}>
            <form 
                onSubmit={form.handleSubmit(onSubmit)} 
                className="mt-10 flex flex-col justify-start gap-10"
            >
                <FormField
                    control={form.control}
                    name="memory"
                    render={({ field }) => (
                        <FormItem className="flex flex-col w-full gap-3">
                        <FormLabel className="text-base-semibold text-light-2">
                            Content
                        </FormLabel>
                        <FormControl className="no-focus border border-dark-4 bg-dark-3 text-light-1">
                            <Textarea
                                rows={15}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="bg-primary-500">Post Memory</Button>
            </form>
        </Form>
    );
}

export default PostMemory;