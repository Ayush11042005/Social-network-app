import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/feed/:path*',
    '/profile/:path*',
    '/messages/:path*',
    '/notifications/:path*',
    '/groups/:path*',
    '/stories/:path*',
    '/explore/:path*',
    '/search/:path*',
    '/settings/:path*',
    '/hashtag/:path*',
  ],
};
