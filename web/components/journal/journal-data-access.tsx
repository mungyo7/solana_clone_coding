"use client";

// import {
//   getJournalProgram,
//   getJournalProgramId,
//   JournalIDL,
// } from "@journal/anchor";
import { Program } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { useMemo } from "react";
import { get } from "http";
import JOURNAL_IDL from "../../solana_program/idl.json";

// Program ID 직접 정의
const JOURNAL_PROGRAM_ID = new PublicKey("2taQ6Nk3APCF7XMZ5QfguyhA1V4acthBSm9kkRpfaSyv");

interface CreateEntryArgs {
  title: string;
  message: string;
  owner: PublicKey;
}

export function useJournalProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const programId = useMemo(
    () => JOURNAL_PROGRAM_ID,
    []
  );
  
  const program = useMemo(() => {
    try {
      return new Program(JOURNAL_IDL as any, provider);
    } catch (error) {
      console.error("Failed to create program:", error);
      return null;
    }
  }, [provider]);

  const accounts = useQuery({
    queryKey: ["journal", "all", { cluster }],
    queryFn: async () => {
      if (!program) return [];
      try {
        return await (program.account as any).journalEntryState.all();
      } catch (error) {
        console.log("No accounts found or program not deployed:", error);
        return [];
      }
    },
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const createEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ["journalEntry", "create", { cluster }],
    mutationFn: async ({ title, message, owner }) => {
      if (!program) throw new Error("Program not initialized");
      
      const [journalEntryAddress] = await PublicKey.findProgramAddress(
        [Buffer.from(title), owner.toBuffer()],
        programId
      );

      return program.methods.createJournalEntry(title, message).rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createEntry,
  };
}

export function useJournalProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program, accounts } = useJournalProgram();
  const programId = JOURNAL_PROGRAM_ID;

  const accountQuery = useQuery({
    queryKey: ["journal", "fetch", { cluster, account }],
    queryFn: async () => {
      if (!program) return null;
      try {
        return await (program.account as any).journalEntryState.fetch(account);
      } catch (error) {
        console.log("Account not found:", error);
        return null;
      }
    },
  });

  const updateEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ["journalEntry", "update", { cluster }],
    mutationFn: async ({ title, message, owner }) => {
      if (!program) throw new Error("Program not initialized");
      
      const [journalEntryAddress] = await PublicKey.findProgramAddress(
        [Buffer.from(title), owner.toBuffer()],
        programId
      );

      return program.methods.updateJournalEntry(title, message).rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      accounts.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update journal entry: ${error.message}`);
    },
  });

  const deleteEntry = useMutation({
    mutationKey: ["journal", "deleteEntry", { cluster, account }],
    mutationFn: (title: string) => {
      if (!program) throw new Error("Program not initialized");
      return program.methods.deleteJournalEntry(title).rpc();
    },
    onSuccess: (tx) => {
      transactionToast(tx);
      return accounts.refetch();
    },
  });

  return {
    accountQuery,
    updateEntry,
    deleteEntry,
  };
}
