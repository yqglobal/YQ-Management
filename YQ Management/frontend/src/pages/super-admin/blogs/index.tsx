import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, Plus, FileText, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SuperAdminBlogs() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    authorName: '',
    seoTitle: '',
    seoDescription: '',
    published: false,
  });

  const queryClient = useQueryClient();

  const { data: blogs, isLoading } = useQuery({
    queryKey: ['super-admin-blogs'],
    queryFn: () => fetchApi('/super-admin/blogs'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/super-admin/blogs', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-blogs'] });
      toast.success('Blog created');
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create blog'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => fetchApi(`/super-admin/blogs/${data.id}`, { method: 'PATCH', body: JSON.stringify(data.payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-blogs'] });
      toast.success('Blog updated');
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update blog'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/super-admin/blogs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-blogs'] });
      toast.success('Blog deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete blog'),
  });

  const openCreateModal = () => {
    setEditingBlog(null);
    setFormData({
      title: '', slug: '', excerpt: '', content: '', coverImage: '', authorName: '', seoTitle: '', seoDescription: '', published: false
    });
    setShowCreateModal(true);
  };

  const openEditModal = async (blog: any) => {
    try {
      const fullBlog = await fetchApi(`/super-admin/blogs/${blog.id}`);
      setEditingBlog(fullBlog);
      setFormData({
        title: fullBlog.title || '',
        slug: fullBlog.slug || '',
        excerpt: fullBlog.excerpt || '',
        content: fullBlog.content || '',
        coverImage: fullBlog.coverImage || '',
        authorName: fullBlog.authorName || '',
        seoTitle: fullBlog.seoTitle || '',
        seoDescription: fullBlog.seoDescription || '',
        published: fullBlog.published || false,
      });
      setShowCreateModal(true);
    } catch (e) {
      toast.error('Failed to load blog details');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingBlog(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this blog?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <SuperAdminLayout>
      <Head>
        <title>Blogs | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blog Manager</h1>
            <p className="text-gray-500">Manage SEO blogs for the Qmova platform</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-black text-white rounded-lg flex items-center space-x-2 hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Blog</span>
          </button>
        </div>

        {/* Blogs List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Author</th>
                <th className="p-4">Published Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading blogs...</td></tr>
              ) : blogs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No blogs created</h3>
                      <p className="text-gray-500 mb-4">Create your first blog post to attract more traffic.</p>
                      <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Write a Blog
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                blogs?.map((blog: any) => (
                  <tr key={blog.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{blog.title}</div>
                      <div className="text-sm text-gray-500">/{blog.slug}</div>
                    </td>
                    <td className="p-4">
                      {blog.published ? (
                        <span className="inline-flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Published</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                          <XCircle className="w-3 h-3" />
                          <span>Draft</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">{blog.authorName || 'Anonymous'}</td>
                    <td className="p-4 text-gray-500 text-sm">
                      {blog.publishedAt ? format(new Date(blog.publishedAt), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openEditModal(blog)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(blog.id)} 
                        disabled={deleteMutation.isPending}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold">{editingBlog ? 'Edit Blog Post' : 'Create Blog Post'}</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Slug (optional)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={e => setFormData({...formData, slug: e.target.value})}
                      className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="auto-generated-from-title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Excerpt</label>
                  <textarea
                    value={formData.excerpt}
                    onChange={e => setFormData({...formData, excerpt: e.target.value})}
                    className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Content (HTML/Markdown)</label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={12}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Author Name</label>
                    <input
                      type="text"
                      value={formData.authorName}
                      onChange={e => setFormData({...formData, authorName: e.target.value})}
                      className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Cover Image URL</label>
                    <input
                      type="url"
                      value={formData.coverImage}
                      onChange={e => setFormData({...formData, coverImage: e.target.value})}
                      className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">SEO Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-500">SEO Meta Title</label>
                      <input
                        type="text"
                        value={formData.seoTitle}
                        onChange={e => setFormData({...formData, seoTitle: e.target.value})}
                        className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-500">SEO Meta Description</label>
                      <input
                        type="text"
                        value={formData.seoDescription}
                        onChange={e => setFormData({...formData, seoDescription: e.target.value})}
                        className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pb-4">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={e => setFormData({...formData, published: e.target.checked})}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="published" className="text-sm font-medium text-gray-900">
                    Publish this blog immediately
                  </label>
                </div>

                <div className="flex justify-end space-x-4 border-t border-gray-100 pt-6 sticky bottom-0 bg-white">
                  <button type="button" onClick={closeModal} className="px-6 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                       <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{editingBlog ? 'Update Blog' : 'Create Blog'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
