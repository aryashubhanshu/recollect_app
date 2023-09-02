import MemoryCard from "@/components/cards/MemoryCard"
import Comment from "@/components/forms/Comment"

import { fetchMemoryById } from "@/lib/actions/memory.actions"
import { fetchUser } from "@/lib/actions/user.actions"
import { currentUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"

const Page = async ({ params }: { params: { id: string }}) => {
    if(!params.id) return null;

    const user = await currentUser();
    if(!user) return null;

    const userInfo = await fetchUser(user.id);
    if(!userInfo?.onboarded) redirect('/onboarding');

    const memory = await fetchMemoryById(params.id);

    return (
        <section className="relative">
            <div>
                <MemoryCard 
                    id={memory._id}
                    currentUserId={user?.id || ""}
                    parentId={memory.parentId}
                    content={memory.text}
                    author={memory.author}
                    community={memory.community}
                    createdAt={memory.createdAt}
                    comments={memory.children}
                />
            </div>

            <div className="mt-7">
                <Comment 
                    memoryId={params.id}
                    currentUserImg={userInfo.image}
                    currentUserId={JSON.stringify(userInfo._id)}
                />
            </div>

            <div className="mt-10">
                {memory.children.map((childItem: any) => (
                    <MemoryCard 
                        key={childItem._id}
                        id={childItem._id}
                        currentUserId={user?.id || ""}
                        parentId={childItem.parentId}
                        content={childItem.text}
                        author={childItem.author}
                        community={childItem.community}
                        createdAt={childItem.createdAt}
                        comments={childItem.children}
                        isComment
                    />
                ))}
            </div>
        </section>
    )
}

export default Page;