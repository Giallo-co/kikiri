import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { storageService } from '../api/storageService';
import { postService } from '../api/postService';
import MainLayout from '../layouts/MainLayout';
import { Music, Image as ImageIcon, X, Send } from 'lucide-react';

const CreatePostPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) {
        throw new Error('Audio is required to publish a post.');
      }
      setUploading(true);
      try {
        const { url, headers, key: audioKey } = await storageService.getPresignedUrl('post_audio', audioFile);
        await storageService.uploadToS3(url, headers, audioFile);

        const imageKeys: string[] = [];
        for (const file of imageFiles) {
          const { url, headers, key } = await storageService.getPresignedUrl('post_image', file);
          await storageService.uploadToS3(url, headers, file);
          imageKeys.push(key);
        }

        return await postService.createPost({
          title,
          body,
          audioKey,
          imageKeys,
        });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      setError('');
      navigate('/');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.message || 'Could not create post.');
    }
  });

  return (
    <MainLayout>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Create New Post</h1>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            if (!audioFile) {
              setError('Audio is required to publish a post.');
              return;
            }
            createPostMutation.mutate();
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Give your post a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What's on your mind?</label>
            <textarea
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              placeholder="Share your thoughts..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Audio (Required)</label>
              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl border-2 border-dashed border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  <Music size={20} />
                  <span className="font-medium">{audioFile ? audioFile.name : 'Upload Audio'}</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Images (Optional)</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-gray-50 text-gray-600 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <ImageIcon size={20} />
                  <span className="font-medium">Upload Images</span>
                </label>
              </div>
            </div>
          </div>

          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {imageFiles.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || createPostMutation.isPending}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-3 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Share Post</span>
              </>
            )}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default CreatePostPage;
