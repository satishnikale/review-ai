import Link from "next/link";

export default function HomePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8">
            <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold text-brand-600">ReviewAI</h1>
                <p className="text-xl text-gray-500">
                    AI-powered GitHub PR reviews
                </p>

                < Link href="http://localhost:4000/api/auth/github"
                    className="inline-block bg-brand-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                    Continue with GitHub
                </Link>
            </div>
        </div>
    );
}