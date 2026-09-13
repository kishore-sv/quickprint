"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type SessionUser = {
  id?: string;
  image?: string | null;
};

export function useGoogleProfileImage(
  user: SessionUser | null | undefined,
  isGuest: boolean
): string | undefined {
  const [image, setImage] = useState<string | undefined>(user?.image ?? undefined);

  useEffect(() => {
    if (isGuest || !user?.id) {
      setImage(undefined);
      return;
    }

    let cancelled = false;

    async function load() {
      const currentUser = user;
      if (!currentUser) return;

      const { data: accounts } = await authClient.listAccounts();
      const googleAccount = accounts?.find((account) => account.providerId === "google");
      if (!googleAccount || cancelled) {
        setImage(undefined);
        return;
      }

      if (currentUser.image) {
        setImage(currentUser.image);
        return;
      }

      const { data: info } = await authClient.accountInfo({
        query: { accountId: googleAccount.id },
      });
      if (!cancelled) {
        setImage(info?.user?.image ?? undefined);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isGuest, user?.id, user?.image]);

  return image;
}
