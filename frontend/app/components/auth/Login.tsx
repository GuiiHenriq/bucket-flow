import React, { useState } from 'react';
import { useMutation } from 'react-relay';
import { useNavigate } from 'react-router-dom';
import { loginMutation } from './AuthMutations';
import type { AuthMutationsLoginMutation } from '../../__generated__/AuthMutationsLoginMutation.graphql';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [commit] = useMutation<AuthMutationsLoginMutation>(loginMutation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    commit({
      variables: {
        input: {
          username,
          password,
        },
      },
      onCompleted: (response) => {
        if (response.login?.token) {
          localStorage.setItem('token', response.login.token);
          navigate('/dashboard');
        }
      },
      onError: (error) => {
        setError(error.message);
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login
        </h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
        <div className="mt-4 text-center flex flex-col space-y-2">
          <button
            onClick={() => navigate('/register')}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Register new account
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="font-medium text-gray-600 hover:text-gray-800"
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}; 