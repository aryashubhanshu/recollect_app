import { fetchUserPosts } from "@/lib/actions/user.actions"
import { redirect } from "next/navigation"
import { fetchCommunityPosts } from "@/lib/actions/community.actions"

import MemoryCard from "../cards/MemoryCard"

interface Props {
    currentUserId: string;
    accountId: string;
    accountType: string;
}

const MemoriesTab = async ({ currentUserId, accountId, accountType }: Props) => {
    let result: any;
    
    if(accountType === 'Community') {
        result = await fetchCommunityPosts(accountId);    
    } else {
        result = await fetchUserPosts(accountId);
    }
    
    if(!result) redirect('/');

    return (
        <section className="mt-9 flex flex-col gap-10">
            {result.memories.map((memory: any) => (
                <MemoryCard 
                    key={memory._id}
                    id={memory._id}
                    currentUserId={currentUserId}
                    parentId={memory.parentId}
                    content={memory.text}
                    author={
                        accountType === "User" 
                        ? { name: result.name, image: result.image, id: result.id }
                        : { name: memory.author.name, image: memory.author.image, id: memory.author.id }
                    }
                    community={memory.community}
                    createdAt={memory.createdAt}
                    comments={memory.children}
                />
            ))}
        </section>
    );
}

export default MemoriesTab;