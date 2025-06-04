"use client";

// Solana 관련 라이브러리 임포트
import { Keypair, PublicKey } from "@solana/web3.js";
import { ellipsify } from "../ui/ui-layout";
import { ExplorerLink } from "../cluster/cluster-ui";
import {
  useJournalProgram,
  useJournalProgramAccount,
} from "./journal-data-access";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

// 저널 생성 컴포넌트
export function JournalCreate() {
  // 저널 생성 함수와 지갑 정보 가져오기
  const { createEntry } = useJournalProgram();
  const { publicKey } = useWallet();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const isFormValid = title.trim() !== "" && message.trim() !== "";

  // 제출 핸들러 CreateEntry@@@@@@@@@@
  const handleSubmit = () => {
    if (publicKey && isFormValid) {
      createEntry.mutateAsync({ title, message, owner: publicKey });
    }
  };

  // 지갑이 연결되지 않은 경우
  if (!publicKey) {
    return <p>Connect your wallet</p>;
  }

  // 입력 폼 렌더링
  return (
    <div className="darker-text">
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input glass-effect w-full max-w-xs darker-text dark-placeholder"
      />
      <textarea
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="textarea glass-effect w-full max-w-xs darker-text dark-placeholder"
      />
      <br></br>
      <button
        className={`btn btn-primary darker-text btn-shadow ${isFormValid ? 'btn-active-style' : 'glass'}`}
        onClick={handleSubmit}
        disabled={createEntry.isPending || !isFormValid}
      >
        Create Journal Entry {createEntry.isPending && "..."}
      </button>
    </div>
  );
}

// 저널 리스트 컴포넌트
export function JournalList() {
  // 프로그램 계정 및 전체 계정 목록 가져오기
  const { accounts, getProgramAccount } = useJournalProgram();

  // 로딩 중일 때
  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }
  // 프로그램 계정이 없을 때
  if (!getProgramAccount.data?.value) {
    return (
      <div className="flex justify-center alert alert-info">
        <span>
          Program account not found. Make sure you have deployed the program and
          are on the correct cluster.
        </span>
      </div>
    );
  }
  // 계정 리스트 렌더링
  return (
    <div className={"space-y-6"}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.data?.map((account: any) => (
            <JournalCard
              key={account.publicKey.toString()}
              account={account.publicKey}
            />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={"text-2xl"}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

// 개별 저널 카드 컴포넌트
function JournalCard({ account }: { account: PublicKey }) {
  // 해당 계정의 쿼리, 수정, 삭제 함수 가져오기
  const { accountQuery, updateEntry, deleteEntry } = useJournalProgramAccount({
    account,
  });
  const { publicKey } = useWallet();
  const [message, setMessage] = useState("");
  const title = accountQuery.data?.title;

  // 폼 유효성 검사
  const isFormValid = message.trim() !== "";

  // 수정 핸들러 => updateJournalEntry 함수 실행@@@@@@@@@@@@@@@@@@@@@
  const handleSubmit = () => {
    if (publicKey && isFormValid && title) {
      updateEntry.mutateAsync({ title, message, owner: publicKey });
    }
  };

  // 지갑이 연결되지 않은 경우
  if (!publicKey) {
    return <p>Connect your wallet</p>;
  }

  // 계정 데이터 로딩 중일 때
  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <div className="card glass-effect shadow-lg">
      <div className="card-body items-center text-center">
        <div className="space-y-6 darker-text">
          <h2
            className="card-title justify-center text-3xl cursor-pointer"
            onClick={() => accountQuery.refetch()}
          >
            {accountQuery.data?.title}
          </h2>
          <p className="text-lg">{accountQuery.data?.message}</p>
          <div className="card-actions justify-around">
            <textarea
              placeholder="Update message here"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea glass-effect w-full max-w-xs darker-text dark-placeholder focus:border-primary"
            />
            <button //updateJournalEntry 버튼@@@@@@@@@@@@@@@@@@@@@
              className={`btn btn-primary darker-text btn-shadow ${isFormValid ? 'btn-active-style' : 'glass'}`}
              onClick={handleSubmit}
              disabled={updateEntry.isPending || !isFormValid}
            >
              Update Journal Entry {updateEntry.isPending && "..."}
            </button>
          </div>
          <div className="text-center space-y-4">
            <p>
              <ExplorerLink
                path={`account/${account}`}
                label={ellipsify(account.toString())}
                className="darker-text"
              />
            </p>
            <button
              className="btn btn-xs btn-secondary glass darker-text font-semibold btn-shadow"
              onClick={() => {
                if (
                  !window.confirm(
                    "Are you sure you want to close this account?"
                  )
                ) {
                  return;
                }
                const title = accountQuery.data?.title;
                if (title) { // deleteJournalEntry 함수 실행@@@@@@@@@@@@@@@@@@@@@
                  return deleteEntry.mutateAsync(title);
                }
              }}
              disabled={deleteEntry.isPending}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}