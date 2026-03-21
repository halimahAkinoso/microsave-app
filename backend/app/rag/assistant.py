from langchain.chains import RetrievalQA
from langchain.vectorstores import Chroma
from langchain.llms import OpenAI

def ask_financial_assistant(question):

    vector_db = Chroma(persist_directory="./vector")

    qa = RetrievalQA.from_chain_type(
        llm=OpenAI(),
        retriever=vector_db.as_retriever()
    )

    return qa.run(question)