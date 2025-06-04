"use client";

import { Program } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey } from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { useMemo } from "react";
import JOURNAL_IDL from "../../solana_program/idl.json";

// 저널 프로그램의 고유 ID (솔라나 블록체인에 배포된 프로그램 주소)
const JOURNAL_PROGRAM_ID = new PublicKey("55yAF94YAnwsSbNSdV9u8UrprNhweyJ52E68t1hX3ZF9");

// 저널 엔트리 생성/수정 시 필요한 인자들의 타입 정의
interface CreateEntryArgs {
  title: string;      // 저널 제목
  message: string;    // 저널 내용
  owner: PublicKey;   // 저널 소유자의 공개키
}

/**
 * 저널 프로그램과의 전반적인 상호작용을 관리하는 메인 훅
 * 프로그램 인스턴스 생성, 계정 조회, 엔트리 생성 기능 제공
 */
export function useJournalProgram() { // createJournalProgram -> account를 새로 만들어야하므로 이는 program이 해야함
  // 솔라나 RPC 연결 객체
  const { connection } = useConnection();
  // 현재 연결된 클러스터 정보 (devnet, testnet, mainnet)
  const { cluster } = useCluster();
  // 트랜잭션 성공 시 토스트 표시 함수(알림창)
  const transactionToast = useTransactionToast();
  // 지갑과 연결된 Anchor 프로바이더
  const provider = useAnchorProvider();
  
  // 프로그램 ID
  // useMemo 
  // 첫 번째 인자: 계산할 값을 반환하는 함수
  // 두 번째 인자: 의존성 배열 (이 값들이 변경될 때만 재계산)
  const programId = useMemo(
    () => JOURNAL_PROGRAM_ID,
    []
  );
  
  // Anchor 프로그램 인스턴스 생성 (IDL과 프로바이더를 사용)
  const program = useMemo(() => {
    try {
      return new Program(JOURNAL_IDL as any, provider);
    } catch (error) {
      console.error("Failed to create program:", error);
      return null;
    }
  }, [provider]);

  // 모든 저널 엔트리 계정들을 조회하는 쿼리
  const accounts = useQuery({
    queryKey: ["journal", "all", { cluster }],
    queryFn: async () => {
      if (!program) return [];
      try {
        // 프로그램의 모든 journalEntryState 계정들을 가져옴 -> 모든 게시글 조회@@
        return await (program.account as any).journalEntryState.all();
      } catch (error) {
        console.log("No accounts found or program not deployed:", error);
        return [];
      }
    },
  });

  // 프로그램 계정 자체의 정보를 조회하는 쿼리
  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  // 새로운 저널 엔트리를 생성하는 뮤테이션
  const createEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ["journalEntry", "create", { cluster }],
    mutationFn: async ({ title, message, owner }) => {
      if (!program) throw new Error("Program not initialized");
      
      // PDA (Program Derived Address) 계산
      // 제목과 소유자를 시드로 사용하여 결정적 주소 생성
      const [journalEntryAddress] = await PublicKey.findProgramAddress(
        [Buffer.from(title), owner.toBuffer()],
        programId
      );

      // 솔라나 프로그램의 createJournalEntry 메서드 호출
      return program.methods.createJournalEntry(title, message).rpc(); // 솔라나 프로그램의 함수 실행!!
    },
    onSuccess: (signature) => {
      // 성공 시 트랜잭션 서명을 토스트로 표시
      transactionToast(signature);
      // 계정 목록 다시 조회하여 UI 업데이트
      accounts.refetch();
    },
    onError: (error) => {
      // 실패 시 에러 메시지 표시
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });

  return {
    program,           // Anchor 프로그램 인스턴스
    programId,         // 프로그램 ID
    accounts,          // 모든 계정 조회 쿼리
    getProgramAccount, // 프로그램 계정 정보 쿼리
    createEntry,       // 엔트리 생성 뮤테이션
  };
}

/**
 * 특정 저널 엔트리 계정을 관리하는 훅
 * 개별 계정 조회, 수정, 삭제 기능 제공
 */
export function useJournalProgramAccount({ account }: { account: PublicKey }) {
  // 현재 클러스터 정보(devnet, testnet, mainnet)
  const { cluster } = useCluster();
  // 트랜잭션 성공 토스트 함수(알림창)
  const transactionToast = useTransactionToast();
  // 메인 프로그램 훅에서 필요한 기능들 가져오기
  const { program, accounts } = useJournalProgram();
  const programId = JOURNAL_PROGRAM_ID;

  // 특정 계정의 데이터를 조회하는 쿼리
  const accountQuery = useQuery({
    queryKey: ["journal", "fetch", { cluster, account }],
    queryFn: async () => {
      if (!program) return null;
      try {
        // 특정 계정 주소로 저널 엔트리 데이터 페치
        return await (program.account as any).journalEntryState.fetch(account);
      } catch (error) {
        console.log("Account not found:", error);
        return null;
      }
    },
  });

  // 기존 저널 엔트리를 수정하는 뮤테이션
  const updateEntry = useMutation<string, Error, CreateEntryArgs>({
    mutationKey: ["journalEntry", "update", { cluster }],
    mutationFn: async ({ title, message, owner }) => {
      if (!program) throw new Error("Program not initialized");
      
      // 업데이트할 엔트리의 PDA 계산
      const [journalEntryAddress] = await PublicKey.findProgramAddress(
        [Buffer.from(title), owner.toBuffer()],
        programId
      );

      // 솔라나 프로그램의 updateJournalEntry 메서드 호출
      return program.methods.updateJournalEntry(title, message).rpc(); // 솔라나 프로그램의 함수 실행!!
    },
    onSuccess: (signature) => {
      // 성공 시 트랜잭션 서명 토스트 표시
      transactionToast(signature);
      // 전체 계정 목록 다시 조회
      accounts.refetch();
    },
    onError: (error) => {
      // 실패 시 에러 메시지 표시
      toast.error(`Failed to update journal entry: ${error.message}`);
    },
  });

  // 저널 엔트리를 삭제하는 뮤테이션
  const deleteEntry = useMutation({
    mutationKey: ["journal", "deleteEntry", { cluster, account }],
    mutationFn: (title: string) => {
      if (!program) throw new Error("Program not initialized");
      // 솔라나 프로그램의 deleteJournalEntry 메서드 호출
      return program.methods.deleteJournalEntry(title).rpc(); // 솔라나 프로그램의 함수 실행!!
    },
    onSuccess: (tx) => {
      // 성공 시 트랜잭션 토스트 표시
      transactionToast(tx);
      // 전체 계정 목록 다시 조회하여 삭제된 항목 반영
      return accounts.refetch();
    },
  });

  return {
    accountQuery, // 개별 계정 조회 쿼리
    updateEntry,  // 엔트리 수정 뮤테이션
    deleteEntry,  // 엔트리 삭제 뮤테이션
  };
}
