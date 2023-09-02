"use server"

import User from "../models/user.model"
import Memory from "../models/memory.model"
import Community from "../models/community.model"

import { revalidatePath } from "next/cache"
import { connectToDB } from "../mongoose"
import { FilterQuery, SortOrder } from "mongoose"

export async function fetchUser(userId: string) {
    try {
        connectToDB();

        return await User
        .findOne({ id: userId })
        .populate({
            path: 'communities',
            model: Community
        })
    } catch (error: any) {
        throw new Error(`Failed to fetch user: ${error.message}`);
    }
}

interface Params {
    userId: string;
    username: string;
    name: string;
    bio: string;
    image: string;
    path: string;
}

export async function updateUser({
    userId,
    bio,
    name,
    path,
    username,
    image,
}: Params): Promise<void> {
    try {
        connectToDB();

        await User.findOneAndUpdate(
            { id: userId },
            { 
                username: username.toLowerCase(),
                name,
                bio,
                image,
                onboarded: true 
            },
            {
                upsert: true
            }
        );
    
        if(path === '/profile/edit') {
            revalidatePath(path);
        }
    } catch (error: any) {
        throw new Error(`Failed to create/update user: ${error.message}`)
    }
}

export async function fetchUserPosts(userId: string) {
    try {
        connectToDB();

        // Find all memories authored by user with the given userId
        const memories = await User.findOne({ id: userId })
            .populate({
                path: 'memories',
                model: Memory,
                populate: [
                    {
                        path: 'community',
                        model: Community,
                        select: 'name id image _id'
                    },
                    {
                        path: 'children',
                        model: Memory,
                        populate: {
                            path: 'author',
                            model: User,
                            select: 'name image id'
                        },
                    },
                ],
            });
        return memories;
    }catch (error) {
        console.error("Error fetching user memories: ", error);
        throw error;
    }
}

export async function fetchUsers({ 
    userId,
    searchString = "",
    pageNumber = 1,
    pageSize = 20,
    sortBy = 'desc'
}: {
    userId: string;
    searchString?: string;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: SortOrder;
}) {
    try {
        connectToDB();

        const skipAmount = (pageNumber - 1) * pageSize;

        const regex = new RegExp(searchString, "i");

        const query: FilterQuery<typeof User> = {
            id: { $ne: userId }
        };

        if(searchString.trim() !== '') {
            query.$or = [
                { username: { $regex: regex }},
                { name: { $regex: regex }}
            ];
        }

        const sortOptions = { createdAt: sortBy };

        const usersQuery = User.find(query)
            .sort(sortOptions)
            .skip(skipAmount)
            .limit(pageSize);

        const totalUsersCount = await User.countDocuments(query);

        const users = await usersQuery.exec();

        const isNext = totalUsersCount > skipAmount + users.length;

        return { users, isNext };
    }catch (error: any) {
        throw new Error(`Failed to fetch users: ${error.message}`);
    }
}

export async function getActivity(userId: string) {
    try{
        connectToDB();

        // find all memories created by the user
        const userMemories = await Memory.find({ author: userId });
        
        // collect all the child memories ids from 'children' field
        const childMemoryIds = userMemories.reduce((acc, userMemory) => {
            return acc.concat(userMemory.children);
        }, []);

        const replies = await Memory.find({
            _id: { $in: childMemoryIds },
            author: { $ne: userId }
        }).populate({
            path: 'author',
            model: User,
            select: 'name image _id'
        });

        return replies;
    }catch (error: any) {
        throw new Error(`Failed to fetch activity: ${error.message}`)
    }
}