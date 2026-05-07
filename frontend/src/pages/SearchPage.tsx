import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../api/userService';
import { postService } from '../api/postService';
import MainLayout from '../layouts/MainLayout';
import PostCard from '../components/PostCard';
import { Search, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'users' | 'posts'>('users');

  const { data: userResults, isLoading: usersLoading } = useQuery({
    queryKey: ['searchUsers', query],
    queryFn: () => userService.searchUsers(query),
    enabled: type === 'users' && query.length > 2,
  });

  const { data: postResults, isLoading: postsLoading } = useQuery({
    queryKey: ['searchPosts', query],
    queryFn: () => postService.searchPosts(query),
    enabled: type === 'posts' && query.length > 2,
  });

  return (
    <MainLayout>
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-indigo-800/60 shadow-lg shadow-indigo-950/40 mb-8">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-indigo-800/60 text-slate-100 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
            placeholder="Search users or posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setType('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              type === 'users' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setType('posts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              type === 'posts' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Posts
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {query.length <= 2 ? (
          <div className="text-center py-12 text-slate-400">
            Type at least 3 characters to start searching.
          </div>
        ) : type === 'users' ? (
          usersLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : userResults && userResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userResults.map((user) => (
                <Link
                  key={user.id}
                  to={`/profile/${user.id}`}
                  className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-800/60 flex items-center space-x-3 hover:border-violet-500/70 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-700 ring-2 ring-violet-400/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {user.profile?.avatarUrl ? (
                      <img src={user.profile.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="text-slate-300" size={16} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{user.username}</h3>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">No users found.</div>
          )
        ) : postsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : postResults && postResults.length > 0 ? (
          postResults.map((post) => <PostCard key={post.postId || post.id} post={post} />)
        ) : (
          <div className="text-center py-12 text-slate-400">No posts found.</div>
        )}
      </div>
    </MainLayout>
  );
};

export default SearchPage;
