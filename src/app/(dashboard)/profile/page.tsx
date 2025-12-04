import UserInfoCard from "@/components/user-profile/UserInfoCard";
import ChangePasswordCard from "@/components/user-profile/ChangePasswordCard";
import { Metadata } from "next";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ubah Profil - SIMLOK",
  description: "Edit your profile information",
};

export default async function Profile() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Fetch complete user data
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id
    }
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <SidebarLayout title="Profil" titlePage="Ubah Profil">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6">
        <div className="space-y-6">
          <UserInfoCard user={user} />
          <ChangePasswordCard />
        </div>
      </div>
    </SidebarLayout>
  );
}
